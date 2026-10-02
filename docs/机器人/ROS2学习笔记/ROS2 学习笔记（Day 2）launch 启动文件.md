# ROS2 学习笔记（Day 2）：launch 启动文件

> 本篇是 Day 2 的详细学习笔记，覆盖：launch 一键启动多个节点、launch 传参数、launch 的两条铁律。
> 对应主教程：《ROS2 入门实践全流程教程》第 8 章。

---

## 一、为什么要学 launch

回顾跑发布-订阅时，你要**手动开两个终端**：

```bash
# 终端1：发布者
ros2 run motor_demo publisher_node
# 终端2：订阅者
ros2 run motor_demo subscriber_node
```

以后节点一多（5 个、10 个），每次手动开一堆终端，又累又容易乱，顺序还不能出错（比如服务端得先启动）。

> **launch = 一个"启动剧本"，一条命令帮你同时启动多个节点。**

---

## 二、launch 文件长什么样

ROS2 的 launch 文件是一个 **Python 文件**，后缀 `.launch.py`，放在包的 `launch/` 目录里。

### 2.1 建目录 + 写文件

```bash
mkdir -p ~/ros2_ws/src/motor_demo/launch
```

文件：`~/ros2_ws/src/motor_demo/launch/demo.launch.py`

```python
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        # 同时启动发布者
        Node(
            package='motor_demo',        # 包名
            executable='publisher_node', # 入口名（setup.py 里注册的）
            name='pub_node',             # 给节点起个别名（可选）
            output='screen'              # 日志打印到屏幕
        ),
        # 同时启动订阅者
        Node(
            package='motor_demo',
            executable='subscriber_node',
            name='sub_node',
            output='screen'
        ),
    ])
```

### 2.2 逐段讲懂

| 代码 | 意思 |
|------|------|
| `from launch import LaunchDescription` | 引入"启动描述"工具 |
| `from launch_ros.actions import Node` | 引入"启动一个 ROS 节点"的动作 |
| `generate_launch_description()` | **固定函数名**，ROS 启动器专门找这个函数 |
| `Node(package=..., executable=..., ...)` | 描述"要启动哪个包里的哪个入口"，跟你 `ros2 run 包名 入口名` 一样 |
| `output='screen'` | 让节点的打印输出显示在终端（不加这个默认不显示日志） |

**核心认知**：launch 文件里的每一个 `Node(...)`，就相当于你手动敲的一条 `ros2 run`。一条 launch 能替代 N 条手动命令。

**三个字段对应关系**：

```
Node(package='motor_demo', executable='publisher_node', name='pub_node')
     ↑包名                  ↑入口名                       ↑改写节点名
ros2 run motor_demo publisher_node
         ↑包名      ↑入口名
```

- `package` / `executable`：对应 `ros2 run 包名 入口名`
- `name`：**改写节点名**（`ros2 node list` 里显示 `pub_node` 而不是代码里 `super().__init__` 定的名字）
- 注意：`name` 只改节点名，**不改话题名**。话题靠话题名对接，和节点名无关

---

## 三、注册 launch（在 setup.py 里声明）

launch 文件不是自动被识别的，需要告诉打包系统"这个文件要装进去"。打开 `setup.py`，修改两处：

```python
# ① 顶部 import 区加这两行（如果还没有）：
import os
from glob import glob

# ② 在 data_files 里加上 launch 目录（找到现有 data_files 段，把新行追加进去，别覆盖原内容）：
data_files=[
    (os.path.join('share', 'motor_demo', 'launch'), glob('launch/*.launch.py')),
]
```

**这两处在干什么（大白话）**：

| 代码 | 作用 |
|------|------|
| `import os` / `from glob import glob` | 从工具箱拿两个工具：`os.path.join` 拼路径、`glob` 找文件 |
| `data_files=[...]` | 告诉打包系统"除了 Python 代码，还有 launch 文件要一起装进 install/" |

打个比方：
> 搬家工人默认只搬**家具**（Python 代码）。你的**相册**（launch 文件）得专门跟他说"这个也要带"——`data_files` 就是这句话。

不配置会怎样？**`ros2 launch` 会报"找不到 launch 文件"**，因为安装包里根本没装它。

> 记住：setup.py 里凡是"照抄模板"的部分，不用深究原理，知道"这段是让 launch 文件被装进包里"就够了。

---

## 四、编译 + 运行

```bash
cd ~/ros2_ws
colcon build
source install/setup.bash
ros2 launch motor_demo demo.launch.py
```

发布者和订阅者**同时跑起来了**。用 `ros2 node list`（在另一个终端敲）会看到：

```
/pub_node
/sub_node
```

---

## 五、launch 传参数：启动时直接带上配置

很多参数是**启动时就该定好的**（比如报警阈值）。在 launch 里传，启动即生效，不用运行后再敲 `param set`。

在 `Node(...)` 里加一个 `parameters` 字段，用**字典**传：

```python
Node(
    package='motor_demo',
    executable='publisher_node',
    name='pub_node',
    output='screen',
    parameters=[{'noise_range': 2.0}]   # 启动时直接设置参数
),
```

**拆解**：

| 写法 | 意思 |
|------|------|
| `parameters=[...]` | `Node()` 专门用来传参数的字段 |
| `{...}` | Python **字典**：参数名 → 参数值 |
| `'noise_range': 2.0` | 把 `noise_range` 启动时设成 2.0 |

### 验证参数真的生效

```bash
ros2 launch motor_demo demo.launch.py
# 另一个终端：
ros2 param get /pub_node noise_range    # 注意节点名是 pub_node（launch 里 name 改写）
```

预期输出 `2.0`。

### 三个设置参数的时机对比

```
代码里 declare 的 0.05   →  默认值（兜底）
launch 里 parameters 的 2.0  →  启动时覆盖
运行中 param set  →  再覆盖
```

优先级：**运行中 set > launch 传参 > 代码默认值**。

---

## 六、launch 的两条铁律（重要）

| 规则 | 说明 |
|------|------|
| **launch 占终端** | 启动后该终端被占用，要敲命令必须**另开终端** |
| **Ctrl+C 全杀** | 退出 launch = 它启动的所有节点一起停止 |

**常见误区**：在 launch 运行的终端里敲 `ros2 node list`，会"没反应"——不是节点没启动，而是 launch 占着这个终端，你的命令根本没执行。**"看节点"永远要在另一个终端做。**

正确姿势（三步）：

| 终端 | 做什么 |
|------|--------|
| 终端1 | `ros2 launch motor_demo demo.launch.py`（保持运行，别关） |
| 终端2（新开） | `ros2 node list`（看到 pub_node / sub_node） |
| 终端2（新开） | `ros2 topic list`、`ros2 param get /pub_node noise_range` |

---

## 七、launch 能做什么（能力地图）

- ✅ 一条命令启动多个节点（今天学会）
- ✅ 启动时给节点传参数（今天学会）
- 🔜 设置节点启动顺序（进阶）
- 🔜 条件启动（调试模式才启动某些节点，进阶）
- 🔜 从配置文件读取参数（进阶）

真实机器人项目里节点非常多（传感器驱动、SLAM、导航、控制、可视化），手动启动根本不可行。launch 就是 ROS 的"项目管理器"。

---

## 八、常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `ros2 node list` 是空的 | 节点没在运行 / 在 launch 占用终端里敲 | 先启动节点，另开终端再查看 |
| launch 报"找不到 launch 文件" | setup.py 没配置 data_files / 没重新 build+source | 按第三节配置后重编 |
| launch 里改了 name 但话题没变 | 正常现象 | name 只改节点名，不改话题名 |
| 参数没生效 | launch 传参和代码 declare 的优先级搞混 | 记住优先级：set > launch > 默认值 |
