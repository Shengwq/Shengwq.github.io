# ROS2 编译与生效：colcon build 和 source 详解

> 为什么每次都要 `colcon build` 之后再 `source`？为什么新开终端又要重新 source？本篇用类比讲透。
> 对应主教程：《ROS2 入门实践全流程教程》第 9 章。

---

## 一、先搞清楚两件事各自干了什么

| 命令 | 干什么 | 类比 |
|------|--------|------|
| `colcon build`（编译） | 把你写的代码**翻译**成机器能运行的文件，放进 `install/` | **做好外卖放进柜子** |
| `source install/setup.bash`（生效） | 把"新东西在哪"这个信息**告诉当前终端** | **外卖员告诉你柜子在哪** |

关键区别：**编译是"制造"，source 是"指路"。**

- `colcon build` 只是把东西做好了
- `source` 只是告诉系统去哪找

---

## 二、打个比方：订外卖

想象你订了一份外卖：

- `colcon build` = **外卖做好了**，放在"外卖柜"（`install/` 文件夹）里
- `source install/setup.bash` = 外卖员**告诉你外卖柜的位置**（更新环境变量）
- 你要是不 source，你压根不知道外卖柜在哪，怎么找到你的外卖？

**当前打开的那条终端，默认不知道"外卖柜"在哪**。ROS 系统只认识它原来就知道的几个地方。你新编译出来的包，装在一个新的、系统"眼生"的位置——所以必须 source 一下，告诉它"看，东西在这"。

---

## 三、为什么每次新开终端都要重新 source？

**因为环境变量不是永久的，它只活在"当前终端"里。**

- 环境变量 = 一张"地址纸条"，写着"去哪找 ROS 的东西"
- 你 source 一次，纸条就贴在这条终端上
- **关掉终端，纸条就没了** → 新终端是一张白纸，又不知道地址了

所以 ROS 的惯例是：

- 每次**新开一个终端**，第一件事就是 `source install/setup.bash`
- （专业的做法是把这行写进 `~/.bashrc`，让每个新终端自动执行，以后就不用手动敲了）

---

## 四、验证一下，加深理解

你在终端里跑这三条，观察区别：

```bash
# 1. 先看当前终端知道哪些包（先 source 过才能看到你的包）
ros2 pkg list | grep motor_demo    # 应该能看到 motor_demo

# 2. 新开一个终端，直接跑（没 source）
ros2 pkg list | grep motor_demo    # 看不到！因为新终端是"白纸"
```

**你之前踩过的坑就是同一个原因**：

> `ros2 run` 报 "No executable found"，表面上说是"找不到入口"，本质是——**ROS 根本没找到你的包**，因为你 build 完没 source，系统不知道 `motor_demo` 存在。

---

## 五、什么情况下 build 后必须重新 source？

| 你做了什么 | 需要重新 source 吗 |
|-----------|-------------------|
| 只改 `.py` 文件里的代码逻辑 | ❌ 不用（build 完直接跑） |
| **改 `setup.py` 的入口点** | ✅ **必须** |
| **新建一个包** | ✅ **必须** |

**原因**：
- 改代码只是"更新旧东西"（位置没变，终端已经知道在哪）
- 新增入口/新包是"引入新东西"（环境变量里还没有它），必须重新 source 才被发现

---

## 六、一句话总结

| 命令 | 类比 | 干了什么 |
|------|------|---------|
| `colcon build` | 做好外卖放进柜子 | 编译，生成 `install/` |
| `source install/setup.bash` | 告诉你柜子在哪 | 更新环境变量，让系统找到包 |
| 新开终端 | 换了个不知道地址的人 | **必须重新 source** |

> **规律**：改完代码 → `colcon build` → `source`，才能跑。缺一不可，顺序也别颠倒。

**自动化方案（可选）**：把 source 写进 `~/.bashrc`，每个新终端自动执行：

```bash
echo "source ~/ros2_ws/install/setup.bash" >> ~/.bashrc
source ~/.bashrc
```

编译快捷命令（改完代码一键编译+生效）：

```bash
echo "alias rb='cd ~/ros2_ws && colcon build && source install/setup.bash'" >> ~/.bashrc
source ~/.bashrc
```

> 多工作空间时可用通配符一次 source 所有 `*_ws`（进阶）：
>
> ```bash
> for d in ~/*_ws/install/setup.bash; do source $d; done
> ```
