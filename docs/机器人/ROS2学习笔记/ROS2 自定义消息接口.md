# ROS2 自定义消息接口

> 本篇覆盖：什么时候要自定义消息、.msg 是什么、完整 5 步流程、**可直接复制的固定模板**、Python 中使用、服务接口 srv、常见坑。
> 对应主教程：《ROS2 入门实践全流程教程》第 6 章（自定义消息）补充。
> 定位：**复制粘贴手册**——package.xml 和 CMakeLists 的写法直接抄，只改包名和文件名。

---

## 一、什么时候需要自定义消息

内置消息（Float64、Twist、Odometry…）都是"单一用途"。想**一次传一组组合数据**时，就自己造一个。

**例**：想传"机器人状态"（名字 + 位置 + 朝向 + 是否忙碌）——没有现成类型，自定义。

---

## 二、.msg 是什么（本质）

一个 `.msg` 文件 = **一张数据字段清单**（像快递单格式）：

```text
# msg/RobotStatus.msg
string robot_name     # 字符串：名字
float64 x             # 浮点：x 坐标
float64 y             # 浮点：y 坐标
float64 theta         # 浮点：朝向
bool is_busy          # 布尔：是否忙碌
```

**类比**：标准消息是 ROS 的"标准信封"，自定义消息是**你自己印的专属信封模板**——印好模板，大家照它装数据。

---

## 三、为什么流程看起来复杂（先搞懂原理，不慌）

**核心原因**：ROS2 消息要**跨语言**用——同一个消息，Python 节点能用、C++ 节点也能用。所以消息不能是"一个 Python 类"，要由**代码生成器**自动为每种语言印一份。

```
你写的图纸（.msg 字段清单）
    ↓ 交给生成器 rosidl_generate_interfaces
生成工厂
    ├→ Python 版类（你 import 用的）
    └→ C++ 版类（别人用，不用你写）

package.xml = 工厂许可证（声明开这个车间）
CMakeLists  = 生产单（声明生产哪张图纸）
```

**关键认知**：复杂全在"跨语言"上。**你不需要理解生成器**，只要按模板配置好，编译时自动出结果。

---

## 四、完整流程（5 步）

### 第 1 步：创建接口包（在 src 下）

```bash
cd ~/topic_ws/src
ros2 pkg create robot_interfaces --build-type ament_cmake
```

- 接口包**必须**用 ament_cmake（ROS2 规定），但**不需要写 C++**
- 包名惯例带 `_interfaces`，方便认出

### 第 2 步：写 .msg 文件

```bash
cd robot_interfaces
mkdir msg
```

新建 `msg/RobotStatus.msg`，内容见第二部分（字段清单）。

### 第 3 步：改 package.xml（加固定 3 行）

在 `<package>` 里加：

```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend>
<exec_depend>rosidl_default_runtime</exec_depend>
<member_of_group>rosidl_interface_packages</member_of_group>
```

> 如果 .msg 字段里用了标准类型（如 std_msgs 的 Header），再加：
> ```xml
> <depend>std_msgs</depend>
> ```

### 第 4 步：改 CMakeLists.txt（加生产单）

在 `ament_package()` **之前**加：

```cmake
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/RobotStatus.msg"
)
```

### 第 5 步：编译 + 生效 + 验证

```bash
cd ~/topic_ws
colcon build --packages-select robot_interfaces
source install/setup.bash

ros2 interface show robot_interfaces/msg/RobotStatus   # 能看到 5 个字段 = 成功
```

---

## 五、固定模板（直接抄）

### package.xml 接口包标准段

```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend>
<exec_depend>rosidl_default_runtime</exec_depend>
<member_of_group>rosidl_interface_packages</member_of_group>
```

### CMakeLists.txt 接口包标准段

```cmake
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/RobotStatus.msg"
)
```

**每次只改两处**：① 包名（ros2 pkg create 时定了）② 文件路径和名字（msg/XXX.msg）

---

## 六、在 Python 节点里使用

和标准消息用法**一模一样**：

```python
from robot_interfaces.msg import RobotStatus

msg = RobotStatus()
msg.robot_name = 'burger'
msg.x = 1.5
msg.y = 2.0
msg.theta = 0.3
msg.is_busy = False

self.pub.publish(msg)   # 发布
```

订阅方同样 import，回调里 `msg.x` 这样取。

**注意**：使用自定义消息的包，必须在 package.xml 里加：

```xml
<depend>robot_interfaces</depend>
```

否则编译时找不到这个接口。

---

## 七、还能自定义服务接口（srv）

服务接口 = 请求 + 响应两部分，中间用 `---` 分隔：

```text
# srv/AddStatus.srv
string question      # 请求部分
---
string answer        # 响应部分
```

CMakeLists 里加声明：

```cmake
rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/RobotStatus.msg"
  "srv/AddStatus.srv"
)
```

Python 中使用：

```python
from robot_interfaces.srv import AddStatus

req = AddStatus.Request()    # 填请求
resp = AddStatus.Response()  # 读响应
```

---

## 八、常见坑速查

| 坑 | 原因 | 解决 |
|----|------|------|
| `Could not find resource 'xxx' of type 'rosidl_interfaces'` | package.xml 少了 `member_of_group` | 补上 |
| 编译报错找不到消息 | CMakeLists 没声明该文件 | 加进 `rosidl_generate_interfaces` |
| Python import 失败 | 没重新编译/source | `colcon build` + `source install/setup.bash` |
| 改了 .msg 不生效 | 消息改了要重编所有用它的包 | 接口包 + 依赖它的包一起重编 |
| 用消息的包编译报错 | 没声明依赖 | package.xml 加 `<depend>接口包名</depend>` |

---

## 九、自查清单

1. 自定义消息的本质？→ 一张字段清单（.msg）
2. 接口包用什么 build-type？→ ament_cmake（但不用写 C++）
3. package.xml 固定三行？→ buildtool_depend / exec_depend / member_of_group
4. CMakeLists 在哪加？→ ament_package() 之前，rosidl_generate_interfaces
5. 验证命令？→ `ros2 interface show 包名/msg/消息名`
6. 用它的包要加什么？→ `<depend>接口包名</depend>`
