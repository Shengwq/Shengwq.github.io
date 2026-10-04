# ROS2 学习必备 Python 基础与实例

> 本篇覆盖 ROS2 开发中用得到的**全部 Python 基础**：从变量、函数、类，到 rclpy 节点模板、发布订阅实例、消息访问、参数服务、异常处理、常用模块——每个知识点都配 ROS 实例。
> 对应主教程：《ROS2 入门实践全流程教程》第 3-7 章（写节点用到的 Python）。
> 定位：**写 ROS 节点时翻这篇就够**，不学无关的 Python 深水区。

---

## 一、Python 在 ROS2 里的角色

ROS2 的 Python 节点 = **"一个 Python 类 + rclpy 提供的工具"**。

```
class 节点名(Node):     ← 类（节点本质是类）
    __init__(self)      ← 初始化（造发布者/订阅者/定时器）
    回调函数(self, msg)  ← 消息来了自动执行
main()                  ← 程序入口
```

所以你需要：Python 基础（类/函数/变量） + rclpy 固定套路（init/spin/shutdown）。

---

## 二、变量与数据类型

### 2.1 基本类型

| 类型 | 写法 | ROS 里的用途 |
|------|------|-------------|
| 整数 int | `count = 0` | 计数、索引 |
| 浮点数 float | `velocity = 0.5` | 速度、位置、角度（ROS 数据几乎全是浮点） |
| 字符串 str | `name = 'motor'` | 话题名、节点名、日志 |
| 布尔 bool | `running = True` | 状态标志 |
| 列表 list | `targets = [(1,0), (2,0)]` | 巡逻目标点列表 |
| 字典 dict | `params = {'max': 1.0}` | 键值对配置 |

**ROS 核心真相**：消息里的数值几乎都是 **float**（位置、速度、角度），所以 float 最常用。

### 2.2 列表 list（常用）

```python
goals = [(1.0, 0.0), (2.0, 0.0), (2.0, 2.0)]   # 巡逻点列表
goals[0]        # 取第 1 个 → (1.0, 0.0)
len(goals)      # 长度 → 3
goals.append((0.0, 0.0))   # 末尾加一个
for g in goals:            # 遍历
    print(g)
```

### 2.3 字典 dict（常用）

```python
config = {'linear_max': 0.22, 'angular_max': 2.84}
config['linear_max']          # 取值 → 0.22
config['angular_max'] = 3.0   # 改值
config.keys()                 # 所有键
```

### 2.4 赋值运算符（常用）

```python
speed += 0.1     # speed = speed + 0.1（累加）
count -= 1
```

**ROS 实例**：速度累加、里程计累加。

---

## 三、字符串与 f-string（日志打印）

### 3.1 三种写法

```python
name = 'turtle'

# ① 拼接（麻烦）
print('节点:' + name)

# ② % 格式化（老式）
print('节点:%s' % name)

# ③ f-string（最推荐！ROS 里最常用）
print(f'节点:{name}')
```

### 3.2 数字格式化（ROS 打印位置/速度必用）

```python
x = 1.23456789
print(f'位置: {x:.2f}')    # 保留 2 位小数 → 位置: 1.23
print(f'速度: {x:.3f}')    # 保留 3 位小数
```

### 3.3 在 ROS 节点里打印

```python
self.get_logger().info(f'收到速度: {msg.data:.3f}')   # 标准写法
```

**规则**：日志里要打数值，一律用 `:.2f`/`:.3f` 限定位数，否则刷屏。

---

## 四、流程控制

### 4.1 if / elif / else（判断）

```python
if distance < 0.5:
    twist.linear.x = 0.0        # 太近了，停
elif distance < 2.0:
    twist.linear.x = 0.1        # 中等距离，慢速
else:
    twist.linear.x = 0.2        # 远，全速
```

### 4.2 for 循环（遍历列表）

```python
for goal in goals:
    print(f'去目标点: {goal}')
```

### 4.3 while 循环（条件循环）

```python
while distance > 0.1:
    # 继续前进...
    pass
```

**注意**：ROS 节点里**很少用 while**（会阻塞 spin），控制逻辑放定时器回调里，用 if 判断状态。这是新手常见误区。

---

## 五、函数

### 5.1 定义与调用

```python
def distance(a, b):          # 两个参数
    return ((a[0]-b[0])**2 + (a[1]-b[1])**2) ** 0.5   # 两点距离

d = distance((0,0), (3,4))   # 调用 → 5.0
```

### 5.2 默认参数（常用）

```python
def move(speed=0.1, duration=1.0):
    ...
```

### 5.3 返回多个值

```python
def get_state():
    return 1.5, 2.0, 0.3     # 返回 x, y, theta

x, y, theta = get_state()    # 一次接三个
```

### 5.4 在 ROS 节点里的两种函数

| 类型 | 例子 | 谁调用 |
|------|------|--------|
| 普通方法 | `def cal_distance(self, a, b)` | 你自己调 |
| 回调函数 | `def timer_callback(self)` | ROS 自动调 |

---

## 六、类与对象（核心中的核心）

**ROS 节点 = 一个类**。这一节必须吃透。

### 6.1 类的骨架

```python
class MotorNode(Node):              # 继承 Node（rclpy 的节点基类）
    def __init__(self):             # 对象"出生"时自动执行
        super().__init__('motor')   # 给节点起名（必须第一行！）
        self.speed = 0.0            # 实例属性（self. 前缀）

    def do_work(self):              # 自定义方法
        self.speed += 0.1
```

### 6.2 self 是什么（新手 80% 的坑）

> **self = "这个节点自己"**。类里的变量和方法都要带 self.，否则会报 `NameError`（找不到名字）或变成局部变量。

```python
def timer_callback(self):
    self.speed += 0.1      # ✅ 存在节点上，下次回调还在
    speed += 0.1           # ❌ 局部变量，函数结束就没了

# 跨回调传数据：必须用 self.xxx
```

### 6.3 继承：super().__init__('名字')

```python
class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')   # 调用父类(Node)的初始化，顺便起名
        ...
```

**规则**：`super().__init__('节点名')` 必须写在 `__init__` 第一行，否则后面的 `create_publisher` 会报错（节点还没初始化）。

### 6.4 继承别的节点（进阶，教程常用）

```python
from demo_python_pkg.person_node import Person_Node

class Writer_node(Person_Node):        # 继承 Person_Node
    def __init__(self, name, age):
        super().__init__(name, age)    # 先初始化父类
        self.book = 'WHU'
```

---

## 七、模块导入

```python
import rclpy                          # 导入整个模块
from rclpy.node import Node           # 导入模块里的某个东西
from std_msgs.msg import Float64      # 导入消息类型
import random
import math
```

**规律**：`from 包.子包 import 名字`——ROS 里消息类型的导入全是这种格式：

```python
from geometry_msgs.msg import Twist      # 速度消息
from nav_msgs.msg import Odometry        # 里程计消息
from sensor_msgs.msg import LaserScan    # 雷达消息
```

---

## 八、常用内置模块（ROS 开发必备）

| 模块 | 常用函数 | ROS 用途 |
|------|---------|---------|
| random | `random.uniform(a,b)` 范围随机 / `random.random()` 0~1 | 模拟传感器噪声 |
| math | `math.pi` / `math.sqrt()` / `math.atan2(y,x)` / `math.cos()` / `math.sin()` | 角度换算、坐标计算 |
| time | `time.sleep()` | 调试暂停（节点里少用） |
| os | `os.environ` 环境变量 / `os.path.join()` | 读配置、路径拼接 |
| json | `json.dumps()` / `json.loads()` | 参数/配置序列化 |
| sys | `sys.argv` 命令行参数 | 读外部参数 |

**实例：math 在巡逻小车的用处**

```python
import math

# 弧度制角度（ROS 全是弧度）
theta = math.pi          # 180°
yaw = math.atan2(dy, dx) # 算出"目标点在我哪个方向"（导航必用）
```

---

## 九、rclpy 节点模板（背下来）

**所有 Python 节点都是这个骨架**：

```python
import rclpy
from rclpy.node import Node

class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')        # ① 节点名
        # ② 这里创建发布者/订阅者/定时器

    # ③ 回调函数

def main(args=None):
    rclpy.init(args=args)                  # ④ 启动 ROS 系统
    node = MyNode()                        # ⑤ 创建节点（触发 __init__）
    rclpy.spin(node)                       # ⑥ 让节点一直运行，等消息/定时器
    rclpy.shutdown()                       # ⑦ 退出

if __name__ == '__main__':
    main()
```

### 每个部分的职责

| 部分 | 作用 |
|------|------|
| `rclpy.init()` | 启动 ROS 底层系统（一次） |
| `MyNode()` | 创建节点对象，自动跑 `__init__` |
| `rclpy.spin(node)` | **挂起等待**：消息来了调回调、定时器响调回调 |
| `rclpy.shutdown()` | 清理退出 |
| `if __name__ == '__main__':` | 只有"直接运行这个文件"时才执行（被 import 时不执行） |

**关键认知**：`spin` 之后程序"活着但不乱跑"，全靠回调驱动——这也是为什么节点里不能用 while 死循环。

---

## 十、发布者完整实例（逐行注释）

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64      # 消息类型：一个浮点数
import random

class MotorPublisher(Node):
    def __init__(self):
        super().__init__('motor_publisher')
        # 造喊话器：往 /motor/velocity 发 Float64，队列 10
        self.pub = self.create_publisher(Float64, '/motor/velocity', 10)
        # 造闹钟：每 0.1 秒响一次，响就执行 timer_callback
        self.timer = self.create_timer(0.1, self.timer_callback)
        self.velocity = 0.0

    def timer_callback(self):
        self.velocity += random.uniform(-0.05, 0.05)   # 加随机噪声
        msg = Float64()            # 造消息盒子
        msg.data = self.velocity   # 把值装进盒子
        self.pub.publish(msg)      # 发出去

def main(args=None):
    rclpy.init(args=args)
    node = MotorPublisher()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

**要记住的四件套**：
1. `create_publisher(类型, 话题名, 队列)` → 造发布者
2. `create_timer(秒, 回调)` → 造定时器（主动触发）
3. `msg = 类型(); msg.data = 值` → 装消息
4. `publish(msg)` → 发出去

---

## 十一、订阅者完整实例（逐行注释）

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64

class MotorSubscriber(Node):
    def __init__(self):
        super().__init__('motor_subscriber')
        # 造监听器：监听 /motor/velocity，来消息就调 listener_callback
        self.sub = self.create_subscription(
            Float64,                    # 消息类型（必须和发布者一致）
            '/motor/velocity',          # 话题名（必须和发布者一致）
            self.listener_callback,     # 回调函数
            10                          # 队列
        )

    def listener_callback(self, msg):   # 收到消息自动执行
        self.get_logger().info(f'收到: {msg.data:.3f}')

def main(args=None):
    rclpy.init(args=args)
    node = MotorSubscriber()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

**发布 vs 订阅**：

| | 发布者 | 订阅者 |
|---|-------|--------|
| 触发 | 定时器主动 | 消息来了被动 |
| 工具 | `create_publisher` | `create_subscription` |
| 回调 | `timer_callback` | `listener_callback(msg)` |
| 关键 | 没有 timer | 有 msg 参数 |

**回调函数的 msg 参数**：ROS 把收到的消息自动传给回调——所以你写 `def xxx_callback(self, msg)`，msg 里就是数据。

---

## 十二、消息对象：访问嵌套数据

ROS 消息是**多层嵌套结构**，像"盒子套盒子"：

```python
# 里程计消息 nav_msgs/msg/Odometry
msg.pose.pose.position.x      # 位置 x
msg.pose.pose.position.y      # 位置 y
msg.twist.twist.linear.x      # 线速度

# 雷达消息 sensor_msgs/msg/LaserScan
msg.ranges[0]                 # 第 0 个激光点的距离（数组）
msg.ranges[100]               # 第 100 个点
min(msg.ranges)               # 最近障碍物距离

# 速度消息 geometry_msgs/msg/Twist（发布用）
twist = Twist()
twist.linear.x = 0.2          # 赋值同理
twist.angular.z = 0.5
```

**规律**：`msg.` 一层层点进去，`.` 后面的名字 = 消息定义里的字段名。想不起结构就 `ros2 interface show 类型` 查。

---

## 十三、日志输出

```python
self.get_logger().info('普通信息')       # 常用
self.get_logger().warn('警告')           # 黄色
self.get_logger().error('错误')          # 红色
```

**调试三板斧**：info 打位置 → 打速度 → 打状态。卡住了先打日志看数值。

---

## 十四、参数与服务（Python 用法）

### 14.1 参数（节点的设置面板）

```python
# 声明参数（在 __init__ 里）
self.declare_parameter('noise_range', 0.05)      # 名字 + 默认值

# 读取参数（每次用都 get，才能读到运行中改的值）
self.get_parameter('noise_range').value
```

**经典坑**：`declare_parameter` 必须写在 `super().__init__()` **之后**（之前会报 `_parameter_overrides` 错误）。

### 14.2 服务端（接收请求，返回响应）

```python
from example_interfaces.srv import AddTwoInts

class Server(Node):
    def __init__(self):
        super().__init__('server')
        self.srv = self.create_service(AddTwoInts, '/add', self.handle)

    def handle(self, request, response):   # 收到请求自动执行
        response.sum = request.a + request.b
        return response                     # 必须返回响应
```

### 14.3 客户端（发请求，等响应）

```python
class Client(Node):
    def __init__(self):
        super().__init__('client')
        self.cli = self.create_client(AddTwoInts, '/add')
        self.req = AddTwoInts.Request()
        self.req.a = 3
        self.req.b = 4

    def call(self):
        future = self.cli.call_async(self.req)   # 异步发请求
        rclpy.spin_until_future_complete(self, future)  # 等响应
        print(future.result().sum)
```

**服务 vs 话题**：话题=广播（点对多点、不管响应）；服务=问答（一对一、有返回值）。

---

## 十五、异常处理（节点容错）

```python
try:
    value = int(user_input)
except ValueError:
    self.get_logger().warn('输入不是数字，用默认值')
    value = 0
```

**ROS 场景**：解析配置、读文件、调用可能失败的服务时包一层，节点不容易崩。

---

## 十六、进阶技巧（能看懂开源代码）

| 技巧 | 写法 | 说明 |
|------|------|------|
| 列表推导式 | `dists = [d for d in msg.ranges if d > 0]` | 一行遍历+过滤 |
| 三元表达式 | `speed = 0.2 if far else 0.1` | 简化 if |
| 类型注解 | `def cal(a: float, b: float) -> float:` | 提示类型（可选） |
| 多变量交换 | `a, b = b, a` | 交换值 |
| enumerate | `for i, g in enumerate(goals):` | 带索引遍历 |
| min/max | `min(msg.ranges)` | 取最值 |

**ROS 实例：雷达最近障碍**

```python
# 一行算"最近障碍物距离"
nearest = min(d for d in msg.ranges if 0 < d < 10)
```

---

## 十七、代码风格与常见坑

### 风格
- 缩进 4 空格（不能用 Tab 混用）
- 变量名：`snake_case`（小写+下划线）：`motor_speed`
- 类名：`CamelCase`：`MotorPublisher`

### 常见坑速查

| 坑 | 原因 | 解决 |
|----|------|------|
| `NameError: name 'xxx' is not defined` | 变量没带 self. 或没定义 | 跨回调数据用 `self.xxx` |
| `super().__init__` 报错 | 起名没写或写错位置 | 必须第一行 `super().__init__('节点名')` |
| 回调里变量不更新 | 用了局部变量而非 self. | 改 `self.变量` |
| 订阅收不到 | 类型/话题名不一致 | 两端核对 |
| 中文乱码 | 编码问题 | 文件头保持 UTF-8 |

---

## 十八、自查清单

1. 节点为什么是类？→ ROS 节点 = 继承 Node 的类，__init__ 初始化，回调驱动
2. self 什么时候必须用？→ 跨回调保存数据必须 self.xxx
3. spin 之后程序在干嘛？→ 挂起等待，回调驱动
4. 发布四件套？→ create_publisher / create_timer / 造消息 / publish
5. 订阅怎么触发？→ 消息来了自动调回调(msg)
6. 嵌套消息怎么取值？→ msg.字段.字段 一层层点
7. 为什么节点里少用 while？→ 会阻塞 spin，控制用定时器+if
8. 消息类型忘了怎么办？→ `ros2 interface show 类型`
