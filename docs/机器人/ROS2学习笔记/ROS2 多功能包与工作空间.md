# ROS2 工作空间与功能包：从零创建全流程

> 本节内容：从零创建一个工作空间、从零创建一个功能包、编译、生效、运行——用最普通的标准方法，把每一步的原理讲清楚。
> 
> 适用：任何功能包（自己写的、开源拉来的）最终都要装进工作空间统一管理。

---

## 一、工作空间到底是什么（先讲原理）

**工作空间（Workspace）不是一个软件，是一个"约好的目录结构"。**

```
my_robot_ws/                  ← 工作空间根目录（名字带 _ws 是惯例，方便认）
├── src/                      ← 源码：所有功能包都放这
├── build/                    ← 编译中间产物（colcon 自动生成）
├── install/                  ← 编译成品（colcon 自动生成）
└── log/                      ← 构建日志（colcon 自动生成）
```

为什么要这样约定？

| 目录 | 放什么 | 为什么单独放 |
|------|--------|-------------|
| src/ | 功能包源码 | 源码要人工管理（git），和自动生成的产物分开 |
| build/ | 编译过程产生的中间文件 | 随时可删，删了重编就行，不该混在源码里 |
| install/ | 编译好的成品（可执行文件、库、配置文件） | 这是"能跑的东西"，source 的就是它 |
| log/ | 构建日志 | 报错时翻日志用 |

**核心认知**：
- 功能包多了以后，如果不约定这个结构，源码、产物、日志会混成一团
- 工作空间 = 用**目录约定**把"源码 / 中间产物 / 成品 / 日志"四类东西分开
- colcon 只认一个规则：**扫描当前目录下 src/ 里的所有功能包**（按 package.xml 识别）

---

## 二、从零创建的标准流程（6 步）

### 第 1 步：创建工作空间目录

```bash
mkdir -p ~/my_robot_ws/src
```

- `mkdir -p`：创建 `my_robot_ws`，并在它下面创建 `src`（-p 表示缺哪层建哪层）
- 现在只有 src/ 是你建的，其余三个目录等编译时 colcon 自动生成

### 第 2 步：进入 src，创建功能包

```bash
cd ~/my_robot_ws/src
ros2 pkg create motor_demo --build-type ament_python
```

- `ros2 pkg create 包名`：官方标准创建功能包的命令（不需要手写文件）
- `--build-type ament_python`：声明这是一个 **Python 包**（对应 C++ 用 `ament_cmake`）
- 执行完，src/ 下会出现 `motor_demo/` 文件夹——这就是一个完整功能包

### 第 3 步：认识功能包内部（原理：一个 Python 功能包的骨架）

```bash
cd ~/my_robot_ws/src/motor_demo
tree   # 或者 ls -R 看结构
```

```
motor_demo/
├── package.xml        ← 功能包的"身份证"：名字、依赖、构建类型
├── setup.py           ← 功能包的"工作证"：告诉系统可执行入口在哪
├── setup.cfg          ← 辅助配置（包路径）
├── resource/          ← 资源标记（一般不用管）
└── motor_demo/        ← 源码目录（包名同名，放 .py 节点代码）
    └── __init__.py
```

**三个关键文件的职责**（原理）：

| 文件 | 类比 | 作用 |
|------|------|------|
| `package.xml` | 身份证 | 声明包名、版本、**依赖**、构建类型——colcon 靠它认出"这是一个功能包" |
| `setup.py` | 工作证 | 声明"这个包提供哪些可执行程序（入口点）"——ros2 run 能敲出命令靠它 |
| `motor_demo/*.py` | 干活的人 | 真正的节点代码，你在这里写发布者/订阅者 |

### 第 4 步：写节点代码（发布者示例）

在 `motor_demo/motor_demo/` 下新建 `publisher_node.py`，写一个最小发布者：

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class Talker(Node):
    def __init__(self):
        super().__init__('talker')                      # 节点名
        self.pub = self.create_publisher(String, 'hello', 10)
        self.timer = self.create_timer(1.0, self.say)   # 每秒触发一次

    def say(self):
        msg = String()
        msg.data = '你好，ROS2'
        self.pub.publish(msg)                           # 发布到话题 hello

def main():
    rclpy.init()
    node = Talker()
    rclpy.spin(node)                                    # 让节点持续运行
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

然后在 `setup.py` 的 `entry_points` 里注册入口（不然 `ros2 run` 找不到）：

```python
entry_points={
    'console_scripts': [
        'publisher_node = motor_demo.publisher_node:main',
    ],
}
```

### 第 5 步：回到根目录，编译

```bash
cd ~/my_robot_ws
colcon build
```

**这一步发生了什么（原理）**：
1. colcon 扫描 `src/` 下所有文件夹，**靠 package.xml 认出功能包**
2. 逐个编译，中间产物放 `build/`，成品装进 `install/`
3. 完成后，`my_robot_ws/` 下出现 build/、install/、log/ 三个新目录

> colcon build必须在工作空间目录下执行，否则会在其他目录下生成 build/、install/、log/文件夹，造成混乱

### 第 6 步：source 生效，运行

```bash
source install/setup.bash
ros2 run motor_demo publisher_node
```

**为什么必须 source（原理）**：

- 编译好的程序在 `install/` 里，但**新终端不知道它在哪**
- `source install/setup.bash` 就是把 `install/` 的路径告诉当前终端（写进环境变量）
- **每个新终端都要 source 一次**（环境变量是跟着终端走的，不会自动继承）
- 嫌麻烦可以把它写进 `~/.bashrc`，让每个新终端自动执行

---

## 三、一个工作空间管理多个功能包

src/ 下可以放任意多个功能包（自己写的 + 开源拉来的都行）：

```
my_robot_ws/src/
├── motor_demo/        ← 你写的
├── lidar_driver/      ← 你写的
└── turtlebot3/        ← git clone 拉来的开源包（它有 package.xml，同样被识别）
```

### 只构建一个包

```bash
colcon build --packages-select motor_demo
```

只编 motor_demo，其他包跳过——**改了哪个编哪个**，不用等全部重编。

### 包之间的依赖（构建顺序）

如果 A 包依赖 B 包的产物（比如我的 Python 包依赖某个 C++ 包的库），在 A 的 package.xml 里声明：

```xml
<depend>demo_cpp</depend>
```

colcon 构建时就会**先编 demo_cpp，再编 A 包**——保证依赖的包先就位，构建不出错。

```bash
Starting >>> demo_cpp      # 先
Finished  <<< demo_cpp
Starting >>> motor_demo    # 后
Finished  <<< motor_demo
```

---

## 四、整个流程一句话版

```bash
mkdir -p ~/my_robot_ws/src                      # ① 建工作空间
cd ~/my_robot_ws/src                            # ② 进 src
ros2 pkg create motor_demo --build-type ament_python   # ③ 建功能包
# ④ 写代码（motor_demo/publisher_node.py + setup.py 注册入口）
cd ~/my_robot_ws                                # ⑤ 回根目录
colcon build                                    # ⑥ 编译
source install/setup.bash                       # ⑦ 让终端认识成品
ros2 run motor_demo publisher_node              # ⑧ 运行
```

---

## 五、常见坑

| 坑 | 原因 | 正确做法 |
|----|------|---------|
| `Package not found` | 没 source，或 source 的不是这个工作空间 | `source install/setup.bash` |
| `No executable found` | setup.py 里没注册入口，或注册后没重新编译+source | 加 entry_points → colcon build → source |
| 在 src/ 里跑 colcon | 产物会生成在 src/ 里，结构乱掉 | **只在工作空间根目录跑** |
| 换目录跑 colcon | build/install/log 散落各处 | 固定：根目录编译 |
| 编译报错找不到依赖包 | 依赖没写进 package.xml，或依赖包没编 | 声明 `<depend>` → 先编依赖 |

---

## 六、自查清单

1. 工作空间是软件吗？→ 不是，是约定的目录结构（src/build/install/log 四件套）
2. 创建功能包的标准命令？→ `ros2 pkg create 包名 --build-type ament_python`
3. colcon 怎么认出功能包？→ 扫描 src/，靠 package.xml
4. 为什么新终端要 source？→ 环境变量不跨终端，source 把 install/ 路径告诉当前终端
5. 只编一个包？→ `colcon build --packages-select 包名`
6. 依赖怎么声明？→ package.xml 加 `<depend>包名</depend>`
