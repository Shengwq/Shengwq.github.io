# ROS2 学习笔记（Day 1）：发布与订阅

> 本篇是 Day 1 的详细学习笔记，覆盖：第一个发布者节点、发布-订阅机制、第二个订阅者节点、Python 代码基础、常见坑。
> 对应主教程：《ROS2 入门实践全流程教程》第 3、4、5 章。

---

## 一、Day 1 结束时你掌握了什么

- 环境：WSL2 + Ubuntu 22.04 + ROS2 Humble（不用装双系统）
- 流程：建工作空间 → 建功能包 → 写节点 → 注册入口点 → 编译 → 运行
- 能力：跑通 talker/listener、写自己的发布者、写自己的订阅者

> 一个重要的认知：**能跑通命令 ≠ 学会。看得懂代码、讲得出原理，才算入门。** 命令是表象，理解机制才是在学 ROS。

---

## 二、发布-订阅：ROS 最核心的机制

### 一句话版本

> **一个节点把数据"喊出来"（发布），其他节点能"听到"（订阅）。**
> 喊的内容叫"话题"（topic），话题里传的数据叫"消息"（message）。

### 三个核心概念

| 概念 | 通俗理解 | 代码里的对应 |
|------|---------|-------------|
| **节点 Node** | 一个独立干活的小程序 | `class ...(Node)` |
| **话题 Topic** | 一条广播频道，谁都能听 | `'/motor/velocity'` |
| **消息 Message** | 频道里传的数据格式 | `Float64`（一个数） |

### 精髓：解耦

喊话的人和听话的人**互不认识**，只通过频道名对接。发布者不知道谁在听，订阅者也不知道谁在喊。好处：

- 加 10 个节点，只要都知道频道名，就能自由互通
- 换掉某个节点，不影响其他节点
- 每个节点可以独立开发、调试、复用

---

## 三、发布者节点：邮递员主动喊

### 3.1 完整代码（带逐行注释）

文件：`motor_demo/motor_demo/publisher_node.py`

```python
# ① 引入工具（固定开头，像系安全带）
import rclpy                      # ROS 本体
from rclpy.node import Node       # 节点工具
from std_msgs.msg import Float64  # 消息类型：一个浮点数
import random                     # 随机数工具（Python 自带）

# ② 定义节点：继承自 Node
class MotorEncoderPublisher(Node):
    def __init__(self):           # 对象"出生时"自动运行的初始化
        super().__init__('motor_encoder_publisher')  # 告诉 ROS 节点名字

        # ③ 造"喊话器"：往 /motor/velocity 话题喊一个浮点数
        self.publisher = self.create_publisher(Float64, '/motor/velocity', 10)

        # ④ 造"闹钟"：每 0.1 秒响一次，响就执行 timer_callback
        self.timer = self.create_timer(0.1, self.timer_callback)
        self.velocity = 0.0       # 速度初始值

    # ⑤ 闹钟响时干活：改数值 → 装盒子 → 喊出去
    def timer_callback(self):
        self.velocity += random.uniform(-0.05, 0.05)  # 加个小随机数，模拟真实波动
        msg = Float64()           # 造一个消息盒子
        msg.data = self.velocity  # 把速度值放进盒子
        self.publisher.publish(msg)  # 真·喊话：发出去

# ⑥ 程序入口（固定模板）
def main(args=None):
    rclpy.init(args=args)         # 启动 ROS 系统
    node = MotorEncoderPublisher()  # 创建节点
    rclpy.spin(node)              # 让节点一直运行，等闹钟响

if __name__ == '__main__':
    main()                        # 文件被直接运行时，从 main() 开始
```

### 3.2 五块结构，各管一件事

| 代码块 | 作用 |
|--------|------|
| `import ...` | 从工具箱拿工具 |
| `class ...(Node)` + `__init__` | 定义节点、起名字 |
| `create_publisher(...)` | 造喊话器，声明"我要往这个话题发这种消息" |
| `create_timer(...)` | 造闹钟，定时触发回调 |
| `main()` + `if __name__` | 程序入口，`spin` 让节点持续运行 |

### 3.3 进阶细节一：话题名为什么带斜杠

- 斜杠 = **层级结构**，像文件夹路径
- `/motor/velocity` = "motor 这个设备下的 velocity 数据"
- 好处：话题多了也整齐，`/motor/velocity`、`/motor/position`、`/imu/accel`…
- 开头的 `/` 表示"全局话题"，规范话题都从 `/` 开始

### 3.4 进阶细节二：缓冲区 10 是什么

- 消息先排进"最多装 10 条"的队列再发出
- 接收方慢了 → 新消息**挤掉最旧的消息**，不无限堆积
- 实时数据（速度/位置）要的是"最新值" → 缓冲小（10）就够
- 一句话：宁可丢旧保新，保证实时性

### 3.5 注册入口点（新手最容易卡的一步）

直接运行 `ros2 run` 会报 "No executable found"。因为新建的 Python 包**没有注册可执行入口**。

打开 `setup.py`：

```python
entry_points={
    'console_scripts': [
        'publisher_node = motor_demo.publisher_node:main',
        #   ↑入口名(ros2 run敲的) ↑定位路径: 源码目录.文件名:函数
    ],
},
```

定位路径拆解：

```
motor_demo  .  publisher_node  :  main
   ↑            ↑                ↑
Python包名     Python文件名      函数名
（源码目录）   （不含 .py）       （程序入口）
```

**规律**：改完 setup.py 必须 `colcon build` + `source install/setup.bash`，否则不生效。

---

## 四、订阅者节点：信箱等信

### 4.1 发布 vs 订阅（重点对照）

| | 发布者 | 订阅者 |
|---|---|---|
| 触发方式 | 闹钟定时（timer） | 监听器待命（subscription） |
| 动作 | 主动喊话 | 被动接收 |
| 回调函数 | `timer_callback` | `listener_callback` |

打个比方：
> **发布者 = 邮递员**，每 10 分钟准时送一封信（不管收件人在不在）。
> **订阅者 = 家门口的信箱**，听到"咚"一声才去取信。它不主动去问"有信没"。

### 4.2 订阅者完整代码（带逐行注释）

文件：`motor_demo/motor_demo/subscriber_node.py`

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64

class MotorSubscriber(Node):
    def __init__(self):
        super().__init__('motor_subscriber')
        # 创建订阅器：监听 /motor/velocity，一有 Float64 消息就调 listener_callback
        self.subscription = self.create_subscription(
            Float64,                  # 消息类型（要和发布者一致）
            '/motor/velocity',        # 监听的话题名（要和发布者一致）
            self.listener_callback,   # 收到消息后执行的函数
            10                        # 缓冲区，和发布者同理
        )

    # 收到消息后自动执行的函数
    def listener_callback(self, msg):
        self.get_logger().info(f'收到速度: {msg.data:.3f} rad/s')

def main(args=None):
    rclpy.init(args=args)
    node = MotorSubscriber()
    rclpy.spin(node)                 # 让节点一直运行，等消息来
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 4.3 关键区别与硬性要求

**关键区别**：发布者用 `timer`（定时器）主动喊；订阅者用 `subscription`（订阅器）被动等，没有定时器。

**硬性要求**：订阅方和发布方必须：
1. **话题名一致**（都是 `/motor/velocity`）
2. **消息类型一致**（都是 `Float64`）

否则频道对不上，谁也听不到谁。

### 4.4 运行验证

开两个终端：

```bash
# 终端1：发布者
ros2 run motor_demo publisher_node
# 终端2：订阅者
ros2 run motor_demo subscriber_node
```

配套命令行工具：

```bash
ros2 node list                    # 查看运行中的节点
ros2 topic list                   # 查看所有话题
ros2 topic echo /motor/velocity   # 命令行直接"监听"话题
ros2 topic info /motor/velocity   # 查看话题信息
```

---

## 五、看懂 Python 代码的小基础

| 写法 | 意思 |
|------|------|
| `import ...` | 从工具箱拿工具（固定开头） |
| `class ...(Node)` | 定义一个"节点" |
| `__init__` | 对象出生时自动运行的初始化 |
| `def xxx_callback` | 到点/来消息时自动执行的函数 |
| `if __name__ == '__main__':` | "文件被直接运行时，从 main() 开始" |
| `self.velocity += 随机数` | 每 0.1 秒在旧值上加小随机数 → 值一直波动 |

---

## 六、常见坑记录

| 问题 | 原因 | 解决 |
|------|------|------|
| `ros2 run` 报 "No executable found" | Python 包没注册入口点 | 在 `setup.py` 的 `console_scripts` 里注册 |
| 改完 setup.py 仍报错 | 没重新编译/生效 | `colcon build` + `source install/setup.bash` |
| 订阅者收不到数据 | 话题名或消息类型不一致 | 核对两边的名字和类型 |

---

## 七、Day 1 的成果

- 看得懂一个真实的 ROS 节点代码（Python）
- 会发布（主动喊）、会订阅（被动听）
- 知道话题命名、缓冲区、回调这些核心机制

> 发布者 + 订阅者两行代码，就是**机器人控制架构的雏形**：传感器（发布）→ 计算（订阅处理）→ 执行。
