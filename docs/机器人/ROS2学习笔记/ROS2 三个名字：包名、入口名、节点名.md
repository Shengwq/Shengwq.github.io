# ROS2 三个名字：包名、入口名、节点名

> ROS2 里最容易混的三个名字：包名、入口名、节点名。本篇逐个讲清它们在哪定义、在哪确认、什么时候用，最后拆解 `setup.py` 入口点。
> 对应主教程：《ROS2 入门实践全流程教程》第 2、3 章。

---

## 一、三个名字总览

| 名字 | 在哪定义 | 在哪确认 | 长什么样 |
|------|---------|---------|---------|
| **包名** | 创建时 + `package.xml` + `setup.py` | `ros2 pkg list` | `motor_demo` |
| **入口名** | `setup.py` 的 `console_scripts` | 自己看 setup.py | `publisher_node` |
| **节点名** | 代码里 `super().__init__('xxx')` | `ros2 node list` | `motor_encoder_publisher` |

---

## 二、逐个讲清

### ① 包名（Package Name）—— 装代码的"项目文件夹名"

**在哪定义**：
- 创建时：`ros2 pkg create --build-type ament_python motor_demo` ← 这个 `motor_demo` 就是包名
- 同时在两个文件里登记：`package.xml` 的 `<name>` 和 `setup.py` 顶部的 `name`

**在哪确认**：`ros2 pkg list | grep motor_demo`

**什么时候用**：`ros2 run motor_demo publisher_node` ← 第一个词

### ② 入口名（Executable Name）—— `ros2 run` 敲的那个词

**在哪定义**：`setup.py` 的 `entry_points`：

```python
'console_scripts': [
    'publisher_node = motor_demo.publisher_node:main',
]
#   ↑入口名（ros2 run 敲的）
```

**在哪确认**：打开 setup.py 看就行

**什么时候用**：`ros2 run motor_demo publisher_node` ← 第二个词

### ③ 节点名（Node Name）—— 运行起来后在系统里登记的名字

**在哪定义**：代码里

```python
class MotorEncoderPublisher(Node):
    def __init__(self):
        super().__init__('motor_encoder_publisher')  # ← 节点名
```

**在哪确认**：运行后 `ros2 node list`，显示的就是它

---

## 三、最容易混的点：入口名 ≠ 节点名

看你自己的例子：

```bash
ros2 run motor_demo publisher_node
        ↑包名       ↑入口名

但运行后 ros2 node list 显示的是：
motor_encoder_publisher
↑节点名（代码里 super().__init__ 指定的）
```

**入口名和节点名经常不一样！**

- 入口名：`ros2 run` 启动时用的"快捷方式"（setup.py 定的）
- 节点名：节点在 ROS 系统里的"身份证"（代码里定的）

如果代码里不写 `super().__init__('xxx')`，ROS 会**默认用入口名当节点名**——所以很多例子看着像同一个名字，其实是"默认继承"了。

---

## 四、为什么节点名重要？

因为以后**话题、服务、参数都挂在节点名下**，而且**同一时间不能有两个同名节点**。你用 `ros2 node list` 看到的就是节点名，用它排查"哪个节点在跑"。

> 补充：launch 里 `name='pub_node'` 可以**改写节点名**，但只改节点名、不改话题名。话题靠话题名对接，和节点名无关。

---

## 五、`setup.py` 的 `entry_points` 详解

### 5.1 `motor_demo.publisher_node:main` 的拆解

```
motor_demo  .  publisher_node  :  main
   ↑            ↑                ↑
Python包名     Python文件名      函数名
（源码目录）   （不含 .py）       （程序入口）
```

三个部分，各管一段：

| 段 | 是什么 | 对应磁盘位置 |
|----|--------|-------------|
| `motor_demo` | Python 包名（源码目录） | `~/ros2_ws/src/motor_demo/motor_demo/` |
| `publisher_node` | 文件名（**不带 .py**） | `.../motor_demo/publisher_node.py` |
| `main` | 文件里的函数 | 文件里的 `def main():` |

连起来翻译成大白话：

> **"到 motor_demo 这个源码目录里，打开 publisher_node.py 这个文件，从它的 main() 函数开始跑"**

### 5.2 关键：这里有两个 motor_demo，含义不同

```
~/ros2_ws/src/motor_demo/          ← 第一个：ROS 功能包目录（package.xml 所在）
~/ros2_ws/src/motor_demo/motor_demo/  ← 第二个：Python 源码目录（.py 文件所在）
```

- `ros2 run` 里的 `motor_demo` → ROS **功能包名**（对应外层目录）
- `:main` 左边的 `motor_demo` → **Python 包名**（对应内层源码目录）

两个名字一样，但一个是"ROS 的包"，一个是"Python 的包"，恰好同名。这是 ament_python 的默认结构，新手经常绕晕。

### 5.3 完整看懂这一行

```python
'publisher_node = motor_demo.publisher_node:main',
#       ↑                       ↑
#  入口名（ros2 run 敲的）    定位路径（入口名指向的目标）
```

**入口名** = 你敲的快捷方式（随便叫啥都行，但习惯上跟文件名一致）
**定位路径** = 系统真正去执行的地方（不能写错，错了就 "No executable found"）

### 5.4 验证方式

```bash
ros2 run motor_demo publisher_node
#             ↑系统查 setup.py 找到这一行
#             然后去执行 motor_demo.publisher_node 文件里的 main()
```

---

## 六、一句话总结

> `motor_demo.publisher_node:main` 是一个**"目录.文件:函数"的定位地址**，跟 `C:\Users\xxx\publisher_node.py` 这种文件路径是同一回事，只是用了 Python 的写法。

看懂这行，setup.py 的入口点就不再是黑盒了。
