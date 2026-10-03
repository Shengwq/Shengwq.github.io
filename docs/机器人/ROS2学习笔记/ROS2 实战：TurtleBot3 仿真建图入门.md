# ROS2 实战：TurtleBot3 仿真建图入门

> 本篇是 TurtleBot3 开源项目实战的详细笔记，从零讲清：仿真是什么、Gazebo 怎么工作、怎么把虚拟小车跑起来建出地图。
> 前置要求：已按《ROS2入门实践全流程笔记》装好环境（WSL2 + Ubuntu 22.04 + ROS2 Humble），已掌握发布/订阅基本概念。
> 环境：Windows + WSL2 + TurtleBot3 Humble 源码编译版

---

## 一、项目全貌：今天在干什么

用一个"4 层结构"理解整个项目，每一层都有自己的图纸和报错——报错时先判断是哪一层，就不会慌：

```
① 你（遥控手柄，终端3）
   ↓ 速度指令 /cmd_vel
② 虚拟世界 Gazebo（终端1）—— 照着"图纸"搭房间和小车，物理引擎让车真的会动
   ↓ 雷达扫描 /scan + 里程计 /odom
③ 大脑（终端2）—— cartographer 边定位边拼地图 /  navigation2 拿着地图导航
   ↓ 地图 /map
④ 显示 RViz + 地图文件 map.pgm
```

| 层 | 名字 | 一句话 | 常见报错 |
|----|------|--------|---------|
| ① | 遥控 | 按 w/a/d 发速度指令（发布者！） | 没设环境变量 |
| ② | 世界 | Gazebo 仿真软件 | gzserver 卡、spawn 失败 |
| ③ | 大脑 | 建图/导航算法 | 话题对不上 |
| ④ | 显示 | RViz 画给你看 | 卡顿、崩 |

---

## 二、三个核心概念（零基础友好）

### 1. 仿真是什么

在电脑里搭一个**机器人练习场**——不花钱买真车、不怕撞墙、随时重置。真实机器人的算法（导航、避障）可以先在这里开发调试，跑通了再上真机。

### 2. Gazebo 是仿真软件

专门给机器人用的 3D 仿真器（区别于游戏引擎）：
- 管**场景**：房间、墙、地面
- 管**物理**：重力、碰撞、摩擦（内置物理引擎）
- 管**传感器**：激光雷达、相机、IMU 会真的产生数据

### 3. TurtleBot3 是什么

韩国 ROBOTIS 公司做的**开源机器人小车**（图纸+代码全公开）：
- 硬件：小车底盘 + 两个轮子 + 树莓派（大脑）+ 激光雷达（眼睛）
- 软件：仿真包（虚拟房间+小车）、建图包、导航包全开源
- 地位：全球最流行的 ROS 入门机器人之一，面试高频话题

---

## 三、Gazebo 怎么"造"出房间和小车：全是配置文件

Gazebo **不会凭空造东西**，一切都靠"模型文件"描述，像乐高说明书：

| 东西 | 用什么文件 | 相当于 |
|------|-----------|--------|
| 虚拟房间 | `.world` 文件（XML 文本） | 房间的设计图纸 |
| 虚拟小车 | `.sdf` 文件（XML 文本） | 小车的零件清单+装配说明 |

### 房间图纸长什么样

```bash
cat ~/turtlebot3_ws/install/turtlebot3_gazebo/share/turtlebot3_gazebo/worlds/turtlebot3_world.world
```

```xml
<include><uri>model://ground_plane</uri></include>  <!-- 引用：铺地面 -->
<include><uri>model://sun</uri></include>           <!-- 引用：挂光源 -->
<physics type="ode">
  <real_time_update_rate>1000</real_time_update_rate>  <!-- 每秒算 1000 次物理 -->
</physics>
<model name="turtlebot3_world">
  <static>1</static>            <!-- 1=静态物体（墙） -->
  <include><uri>model://turtlebot3_world</uri></include>  <!-- 引用房间主体 -->
</model>
```

**关键认知**：
- `<include>` = 引用，像 C 语言 `#include`——墙的详细定义在 `models/turtlebot3_world/model.sdf` 里
- 改文件 = 改世界（改物理频率、往房间加模型）
- 这些文件是**开源项目写好的**，clone 下来就自带，可以按需修改

### 小车图纸里的雷达配置

```bash
cat ~/turtlebot3_ws/install/turtlebot3_gazebo/share/turtlebot3_gazebo/models/turtlebot3_burger/model.sdf
```

里面能看到小车的"零件清单"：底盘（质量）、轮子（位置）、雷达（每秒扫几次、一圈几个点）——改这些数字 = 改小车的"眼睛"。

---

## 四、安装配置全流程（实测命令）

### 1. 安装依赖

```bash
sudo apt install ros-humble-gazebo-* ros-humble-cartographer \
  ros-humble-cartographer-ros ros-humble-navigation2 ros-humble-nav2-bringup
```

缺什么补什么（常见）：
```bash
sudo apt install ros-humble-turtlebot3-msgs ros-humble-dynamixel-sdk
```

### 2. 建工作空间 + clone 两个仓库

**turtlebot3 需要两个仓库**（容易漏第二个）：

```bash
mkdir -p ~/turtlebot3_ws/src
cd ~/turtlebot3_ws/src

# 仓库1：主仓库（含消息 msgs、建图 cartographer、导航 navigation2）
git clone -b humble https://github.com/ROBOTIS-GIT/turtlebot3.git
# 仓库2：仿真仓库（含 Gazebo 世界和小车模型）
git clone -b humble https://github.com/ROBOTIS-GIT/turtlebot3_simulations.git
```

> GitHub 国内访问不稳定时：换镜像 `https://ghproxy.com/https://github.com/...`，或设置 `git config --global http.version HTTP/1.1` 后重试。

### 3. 编译

```bash
cd ~/turtlebot3_ws
colcon build --symlink-install
source install/setup.bash
```

> `--symlink-install`：编译产物不复制，只做"快捷方式"指向源码——开发期改代码不用重新 build（Python 包直接生效）。正式部署用普通 `colcon build`。

### 4. 设置环境变量（写进 ~/.bashrc 一劳永逸）

```bash
echo "source ~/turtlebot3_ws/install/setup.bash" >> ~/.bashrc
echo 'export TURTLEBOT3_MODEL=burger' >> ~/.bashrc
echo 'export GAZEBO_MODEL_PATH=$GAZEBO_MODEL_PATH:/opt/ros/humble/share/turtlebot3_gazebo/models' >> ~/.bashrc
source ~/.bashrc
```

> `TURTLEBOT3_MODEL` 是 turtlebot3 所有启动脚本的"入场券"（burger/waffle 车型选择），不设就报 `KeyError: 'TURTLEBOT3_MODEL'`。

---

## 五、建图流程（SLAM）

三个终端，各管一层：

```bash
# 终端1：启动虚拟世界（场地）
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py

# 终端2：启动建图（大脑，会弹出 RViz）
ros2 launch turtlebot3_cartographer cartographer.launch.py

# 终端3：键盘遥控（手柄），w/a/d 开小车逛房间
ros2 run turtlebot3_teleop teleop_keyboard
```

建图成功的关键日志：
```
odom rate: 29.41 Hz      ← 里程计数据正常
scan rate: 5.00 Hz       ← 雷达数据正常
Added trajectory with ID '0'  ← 建图轨迹已启动
```

### SLAM 是什么

**同时定位与建图**。比喻：闭着眼走进陌生房间，边走边用手杖（激光）探墙，同时在脑子里记"走了几步、拐了几次弯、墙在哪"——走完，脑子里就有了房间地图。

- 定位 = 我走到哪了
- 建图 = 墙在哪、路在哪
- 两者互相依赖，同时完成

### 保存地图

```bash
ros2 run nav2_map_server map_saver_cli -f ~/map
```

生成 `~/map.pgm`（图片）和 `~/map.yaml`（配置）。

用 Windows 图片查看器直接看（绕过卡顿的 RViz）：

```bash
explorer.exe ~/map.pgm
```

### 地图怎么读

| 颜色 | 含义 |
|------|------|
| 灰色 | 没探索到的区域 |
| 白色 | 逛过、确认是空地的区域 |
| 黑色 | 障碍物/墙壁边缘 |

---

## 六、WSL2 跑 Gazebo 卡顿：原因与独显切换

### 为什么 WSL2 3D 仿真性能一般

WSL2 本质是轻量虚拟机，GPU 不是直通的：
1. OpenGL 调用要**翻译**成 Windows 的 Direct3D 12 再交给显卡（WSLg 转译层）
2. 显卡加速没生效时回退 `llvmpipe`（**用 CPU 算画面**）→ 灾难级卡顿
3. 窗口还要经 Wayland/XWayland 转发回 Windows 显示

**注意**：物理仿真引擎是 CPU 算的，基本没损失——**慢的是画面渲染，不是仿真逻辑**。

### 自查：用的是不是核显

```bash
sudo apt install mesa-utils
glxinfo -B
```

- `D3D12 (Intel...)` → 核显（默认走核显，省电策略）
- `llvmpipe` → 软件渲染（最卡，先 `wsl --update` + `wsl --shutdown` 重启）

### 切到独显（立竿见影）

```bash
echo 'export MESA_D3D12_DEFAULT_ADAPTER_NAME="NVIDIA GeForce RTX 4060 Laptop GPU"' >> ~/.bashrc
source ~/.bashrc
```

变量名写**设备管理器里显示的显卡全名**。改完重启 GUI 程序（RViz 等），验证 `glxinfo -B` 的 renderer 变为独显。

切独显后 RViz 流畅度"提升无数倍"——实测有效。

> 注意：如果 gzserver（世界后台）在独显变量下启动卡住，可以让 gzserver 用默认设置（启动它的终端 `unset MESA_D3D12_DEFAULT_ADAPTER_NAME`），只让 RViz 用独显。

---

## 七、常见坑记录

| 问题 | 原因 | 解决 |
|------|------|------|
| `Package 'turtlebot3_gazebo' not found` | 新终端没 source | `source ~/turtlebot3_ws/install/setup.bash`（或写进 .bashrc） |
| `KeyError: 'TURTLEBOT3_MODEL'` | 没设车型变量 | `export TURTLEBOT3_MODEL=burger` |
| clone 报 HTTP/2 / TLS 错误 | 国内访问 GitHub 不稳定 | 镜像 / `git config --global http.version HTTP/1.1` |
| 编译报 `Could not find turtlebot3_msgs` | 缺依赖包 | `sudo apt install ros-humble-turtlebot3-msgs` |
| 编译报 `Could not find dynamixel_sdk` | 缺依赖包 | `sudo apt install ros-humble-dynamixel-sdk` |
| launch 报"找不到 launch 文件" | 文件名不对 | `ls .../share/包名/launch/` 看真实文件名 |
| gzserver 死 / spawn 超时 | 残留进程 / 初始化卡住 | `pkill -f gzserver` 后重启 |
| gzclient 崩溃 | WSL2 下老毛病 | 无视（画面而已，gzserver 活着就行） |
| RViz 卡成 PPT | 核显渲染 | 切独显（见第六节） |
| RViz 一开 TF 就崩 | Mesa 转译层着色器 bug | 关掉 TF，用 LaserScan + Odometry 轨迹 |
| 不知道小车在哪 | 没看对地方 | 激光点云中心=小车；Odometry 轨迹末端=小车位置 |

---

## 八、下一步：导航

建图打通后，进入 Navigation——让小车"拿着地图自己找路"：

```bash
# 终端1：启动世界
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
# 终端2：启动导航
ros2 launch turtlebot3_navigation2 navigation2.launch.py
# 终端3：遥控（备选，导航时也可不用）
ros2 run turtlebot3_teleop teleop_keyboard
```

在 RViz 里用顶部 "2D Goal Pose" 按钮，在地图上点一个目标点，小车自己规划路径走过去。

---

## 九、自查清单

1. 仿真是什么？→ 电脑里的机器人练习场
2. Gazebo 怎么造房间和小车？→ 读 .world/.sdf 配置文件
3. 房间图纸里 include 是什么意思？→ 引用模型库里的模型文件
4. turtlebot3 要 clone 几个仓库？→ 两个：turtlebot3 + turtlebot3_simulations
5. 建图是什么原理？→ SLAM：边定位边建图
6. 为什么 WSL2 3D 卡？→ GPU 转译层开销；核显/软件渲染
7. 怎么切独显？→ `MESA_D3D12_DEFAULT_ADAPTER_NAME` 环境变量
8. gzclient 崩了怎么办？→ 不用管，gzserver 活着就行
