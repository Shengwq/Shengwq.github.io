# 📘 ROS2 入门学习笔记（Day 1）

> **一句话总结今天**:搞懂了一个 ROS 节点是如何"喊话"和"听话"的。

------

## 一、我们今天站在哪

- 环境：**WSL2 + Ubuntu 22.04 + ROS2 Humble**（不用装双系统，Windows 里无缝跑 Linux）
- 方式：VS Code 里连到 Ubuntu 写代码，终端就是 Ubuntu 环境
- 你已能：跑通 talker/listener、建工作空间、自己写节点

> 💡 关键心态：**能跑通命令 ≠ 学会。看得懂代码、讲得出原理，才算入门。**

------

## 二、ROS 最核心的一章：发布-订阅

> 一句话版本：**一个节点把数据"喊出来"（发布），其他节点能"听到"（订阅）。** 你说的话是"话题"（topic），喊的内容是"消息"（message）。

三个核心概念，就这么简单：

| 概念             | 通俗理解               | 代码里的对应        |
| ---------------- | ---------------------- | ------------------- |
| **节点 Node**    | 一个独立干活的小程序   | `class ...(Node)`   |
| **话题 Topic**   | 一条广播频道，谁都能听 | `'/motor/velocity'` |
| **消息 Message** | 频道里传的数据格式     | `Float64`（一个数） |

**精髓**：喊话的人和听话的人**互不认识**，只通过频道名对接 → 这就是 ROS 的"解耦"。

------

## 三、发布节点：邮递员主动喊

### 触发方式

- 用**闹钟**（`timer`）定时喊话
- 到点自动执行 `timer_callback`

### 代码结构拆解（30 行，其实只有 5 块）

```python
# ①1引入工具（工具箱拿东西，固定写法）
import rclpy # ROS 本体
from rclpy.node import Node # 节点工具
from std_msgs.msg import Float64 # 消息类型
import random # 随机数工具

# ② 定义节点（给程序起个名）
class MotorEncoderPublisher(Node):
    def __init__(self): # __init__：一个对象“出生时”自动运行的初始化代码
        super().__init__('motor_encoder_publisher') # 告诉ROS"我的名字叫 motor_encoder_publisher

        # ③ 造喊话器：往 /motor/velocity 喊一个浮点数
        self.publisher = self.create_publisher(Float64, '/motor/velocity', 10)

        # ④ 造闹钟：每 0.1 秒响一次，响就做 timer_callback
        self.timer = self.create_timer(0.1, self.timer_callback)
        self.velocity = 0.0

    # ⑤ 闹钟响时干活：改数值 → 装盒子 → 喊出去
    def timer_callback(self):
        self.velocity += random.uniform(-0.05, 0.05)   # 加个小随机数，模拟真实波动
        msg = Float64()
        msg.data = self.velocity
        self.publisher.publish(msg)                    # 真·喊话
# 程序入口（固定模板）
def main(args=None):
    rclpy.init(args=args)
    node = MotorEncoderPublisher()
    rclpy.spin(node)          # 让节点一直转圈，等闹钟响

if __name__ == '__main__':
    main()
```

### 两个进阶细节

**① 话题名为什么带斜杠 `/motor/velocity`**

- 斜杠 = **层级结构**，像文件夹路径
- `/motor/velocity` = motor 设备下，velocity 数据
- 好处：话题多了也整齐 —— `/motor/velocity`、`/motor/position`、`/imu/accel`…
- 开头的 `/` 表示"全局话题"，规范话题都从 `/` 开始

**② 缓冲区 10 是什么**

- 消息先排进"最多装 10 条"的队列再发出
- 接收方慢了 → 新消息**挤掉最旧的消息**，不无限堆积
- 实时数据（速度/位置）要**最新值** → 缓冲小（如 10）就够了

------

## 四、订阅节点：信箱等信（今天最后一章）

### 触发方式

- 用**监听器**（`subscription`）随时待命
- **来消息自动触发回调函数**，不用自己轮询

### 发布 vs 订阅（重点对照）

|          | 发布者            | 订阅者                     |
| -------- | ----------------- | -------------------------- |
| 触发方式 | 闹钟定时（timer） | 监听器待命（subscription） |
| 动作     | 主动喊话          | 被动接收                   |
| 回调函数 | `timer_callback`  | `listener_callback`        |

### 订阅节点核心代码

```python
import rclpy # ROS 本体
from rclpy.node import Node # 节点工具
from std_msgs.msg import Float64 # 消息类型

# 定义“电机编码器订阅者”类，继承自ROS节点
class MotorSubscriber(Node):
    # 初始化函数
    def __init__(self):
        super().__init__('motor_subscriber')
        # 创建订阅器：监听 /motor/velocity 话题，一有 Float64 消息就调 callback
        self.subscription = self.create_subscription(
            Float64,                  # 消息类型（要和发布者一致）
            '/motor/velocity',        # 监听的话题名（要和发布者一致）
            self.listener_callback,   # 收到消息后执行的函数
            10                        # 缓冲区，和发布者同理
        )
    # 收到消息后执行的函数
    def listener_callback(self, msg):
        # 有消息来了，自动执行这里
        self.get_logger().info(f'Received motor velocity: {msg.data:.3f} rad/s')
# 程序入口
def main(args=None):
    rclpy.init(args=args) # 启动 ROS 系统
    node = MotorSubscriber() # 创建节点——> 也就是创建一个“电机编码器订阅者”
    rclpy.spin(node) # 让节点一直运行，等消息来
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()

```

> 💡 打个比方：**发布者 = 邮递员准时送信；订阅者 = 信箱，听到"咚"一声才去取。**

------

## 五、绕不开的小基础：看懂 Python 代码

- `import` = 从工具箱拿工具（固定模板，像系安全带）
- `class ...(Node)` = 定义一个"节点"
- `__init__` = 对象出生时自动运行的初始化
- `def xxx_callback` = 到点/来消息时自动执行的函数
- `if __name__ == '__main__':` = "文件被直接运行时，从 main() 开始"
- `self.velocity += 随机数` = 每 0.1 秒在旧值上加小随机数 → 值一直波动

------

## 六、今天踩过的坑（以后不会再犯）

1. **`ros2 run` 报 "No executable found"** → Python 包要手动在 `setup.py` 的 `console_scripts` 里注册入口点

   ```
   'subscriber_node = motor_demo.subscriber_node:main',
   ```

   → 改完**必须重新 `colcon build` + `source install/setup.bash`**

2. **新建包的入口点是空的** → 创建包后第一件事就是补 `entry_points`

------

## 七、你已经掌握的"真本事"

- 看得懂一个真实的 ROS 节点代码
- 会发布（主动喊）、会订阅（被动听）
- 知道话题命名、缓冲区、回调这些核心机制

> 你现在的两行代码，就是**机器人控制架构的雏形**： 传感器（发布）→ 计算（订阅处理）→ 执行

------

## 八、下次预告

- 让订阅者收到速度后**做判断**（速度超阈值报警），体验"数据进来 → 程序决策"
- 更进阶：改话题名/发布频率、加 `/motor/position` 话题练手感
- 再往后：把模拟数据换成**真 STM32 串口数据**，走到实机

> 保持这个节奏：**先讲懂原理 → 再动手 → 停下来消化 → 再往前。** 慢一点，后面全是加速。





