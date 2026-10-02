# ROS2 核心概念速查表

> 每个概念按"一句人话 + 代码里在哪 + 为什么存在"展开。
> 对应主教程：《ROS2 入门实践全流程教程》第 2、4、9 章。

---

## 1. 节点（Node）

**人话**：一个独立干活的小程序。机器人里可以有几十个节点，各干各的，互不干扰。

**代码里**：

```python
class MotorEncoderPublisher(Node):            # 定义节点，继承自 Node 类
    super().__init__('motor_encoder_publisher')  # 给节点起名
```

**为什么存在**：ROS 的理念是"分而治之"——把复杂系统拆成很多小节点，每个只负责一件事，方便调试、复用、替换。

**验证命令**：`ros2 node list`（看系统里有哪些节点）

---

## 2. 话题（Topic）

**人话**：一条广播频道，谁都能往上面发数据，谁都能听。发的人和听的人互不认识，只认频道名。

**代码里**：

```python
'/motor/velocity'   # 话题名
```

**为什么带斜杠**：斜杠是**层级结构**，像文件夹路径。`/motor/velocity` = "motor 设备下的 velocity 数据"。开头的 `/` 表示"全局话题"，规范话题都从 `/` 开始。话题多了能整齐分类（`/motor/position`、`/imu/accel`…）。

**验证命令**：
- `ros2 topic list`（看所有话题）
- `ros2 topic echo /motor/velocity`（监听某个话题）
- `ros2 topic info /motor/velocity`（看话题信息）

**精髓**：**解耦**。发布者和订阅者不认识，只通过频道名对接。

---

## 3. 消息（Message）

**人话**：话题里传的**数据格式**，就是"盒子里装的东西长什么样"。你说"我喊一个浮点数"，这个浮点数就是消息。

**代码里**：

```python
from std_msgs.msg import Float64   # 引入消息类型
msg = Float64()                    # 造一个消息盒子
msg.data = self.velocity           # 把速度值放进盒子
```

**注意**：**订阅方和发布方必须用同一种消息类型**，否则频道对不上。

---

## 4. 发布者（Publisher）

**人话**：主动"喊话"的一方。它造一个喊话器，往里喊数据。

**代码里**：

```python
self.publisher = self.create_publisher(Float64, '/motor/velocity', 10)
```

**三个参数**：
1. 消息类型（`Float64`）
2. 话题名（`/motor/velocity`）
3. 缓冲区（`10`，最多排队 10 条，满了丢最旧的）

**触发方式**：用**闹钟**（timer）主动定时喊，到点自动执行回调。

---

## 5. 订阅者（Subscriber）

**人话**：被动"听话"的一方。它造一个监听器，盯住某话题，**消息一来自动触发**，不用自己轮询。

**代码里**：

```python
self.subscription = self.create_subscription(
    Float64, '/motor/velocity', self.listener_callback, 10
)
```

**四个参数**：
1. 消息类型
2. 话题名
3. **回调函数**（来消息自动执行它）
4. 缓冲区

**和发布者的对照**：

| | 发布者 | 订阅者 |
|---|---|---|
| 触发 | 闹钟定时（主动喊） | 监听器待命（被动听） |
| 工具 | `create_publisher` | `create_subscription` |
| 回调 | `timer_callback` | `listener_callback` |

---

## 6. 回调（Callback）

**人话**：**"一触发就自动执行的那个函数"**。不用写循环去轮询，ROS 自动帮你盯着，到点/来消息就调用它。

**代码里**：

```python
def timer_callback(self):         # 闹钟响了执行
def listener_callback(self, msg): # 来消息了执行
```

**为什么重要**：这是 ROS 异步机制的核心。你只管"定义好到时候该干什么"，ROS 负责"什么时候叫醒你"。

---

## 7. 定时器（Timer）

**人话**：节点里的"闹钟"，设定间隔，到点自动触发回调。

**代码里**：

```python
self.timer = self.create_timer(0.1, self.timer_callback)  # 每 0.1 秒响一次
```

**为什么用**：传感器/控制需要周期性采样（比如 100Hz），定时器让发布者能按固定节奏喊话。

---

## 8. 缓冲区（Buffer / 队列长度）

**人话**：消息先排进"最多装 N 条"的队列再发出。接收方慢了 → **新消息挤掉最旧的消息**，不无限堆积。

**代码里**：`create_publisher(..., 10)` 和 `create_subscription(..., 10)` 最后的 `10`。

**为什么**：实时数据要"最新值"比"堆积的旧值"有用，宁可丢旧保新。

---

## 9. 程序名字（`ros2 run` 到底在运行什么）

**人话**：`ros2 run motor_demo publisher_node` 里最后那个 `publisher_node`，不是随便起的——它是你在 `setup.py` 里**手动注册的入口名**，指向某个 Python 文件里的 `main()` 函数。

**代码里**（`setup.py`）：

```python
entry_points={
    'console_scripts': [
        'publisher_node = motor_demo.publisher_node:main',
        #      ↑命令名                ↑包名.文件名   ↑入口函数
    ],
},
```

**拆解这条命令**：

```
ros2 run motor_demo publisher_node
        ↑包名        ↑setup.py里注册的入口名
```

**为什么之前报 "No executable found"**：新建的包 `entry_points` 是空的，ROS 找不到可执行入口 → 必须手动注册 → 然后 `colcon build` + `source install/setup.bash` 生效。

> ⚠️ **关键坑**：改完 `setup.py` 必须重新编译并 source，否则 ROS 还记着旧配置。

---

## 10. 包（Package）

**人话**：ROS 里代码的**最小组织单位**，一个包就是一个独立功能模块（相当于一个"项目文件夹"）。

**代码里**：

```bash
ros2 pkg create --build-type ament_python motor_demo
#                     ↑Python包类型              ↑包名
ros2 run motor_demo publisher_node   # 前两个词里的 motor_demo 就是包名
```

**目录结构**（Python 包）：

```
motor_demo/
├── setup.py          ← 打包/注册入口点的地方
├── package.xml       ← 包的信息和依赖
└── motor_demo/       ← 你的 Python 源码（和包同名）
    ├── publisher_node.py
    └── subscriber_node.py
```

**同名嵌套目录**：外层 `motor_demo/` 是 ROS 功能包（`package.xml` 所在），内层 `motor_demo/motor_demo/` 是 Python 源码目录（`.py` 所在）。两个 `motor_demo` 含义不同，注意区分。

---

## 11. 工作空间（Workspace）

**人话**：放所有包的"大文件夹"。你创建的 `~/ros2_ws`，里面 `src/` 放源码包，编译后生成 `install/`。

**代码里**：

```bash
mkdir -p ~/ros2_ws/src   # 建工作空间和源码目录
cd ~/ros2_ws
colcon build             # 编译所有包
source install/setup.bash  # 让系统"认识"编译好的包
```

---

## 12. 其他固定模板词（看到不慌）

| 写法 | 意思 |
|------|------|
| `import rclpy / Node / Float64` | 从工具箱拿工具（固定开头） |
| `if __name__ == '__main__':` | "文件被直接运行时，从 main() 开始" |
| `rclpy.init(args=args)` | 启动 ROS 系统 |
| `rclpy.spin(node)` | 让节点一直运行，等闹钟/消息触发 |
| `self.get_logger().info(...)` | 打印日志（`f'...{msg.data:.3f}...'` 是格式化输出） |

---

## 总结：概念之间的连线

```
   发布者（主动喊）                        订阅者（被动听）
   ├─ 定时器 timer 定时触发                 ├─ 订阅器 subscription 待命
   └─ 造消息 → 往【话题】喊                  └─ 来消息 → 自动执行【回调】
                        │
              【话题】= 广播频道
              【消息】= 频道里传的数据格式
              【节点】= 干活的小程序（发或听）
              【包】= 装节点的项目文件夹
              【工作空间】= 装所有包的文件夹
   ⚠ 订阅和发布必须：话题名一致 + 消息类型一致
```

## 自查清单（能答上 = 概念过关）

1. 话题名为什么带斜杠？→ **层级结构，分类用**
2. 缓冲区满了会发生什么？→ **丢最旧的，保最新的**
3. 发布者和订阅者触发方式有什么不同？→ **定时器主动 vs 订阅器被动**
4. `ros2 run motor_demo publisher_node` 里 `publisher_node` 从哪来？→ **setup.py 入口点**
5. 报 "No executable found" 怎么办？→ **注册入口点 + 重新 build + source**
