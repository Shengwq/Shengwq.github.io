# ROS2 学习笔记（Day 4）：自定义消息 + 实战排错

> 本篇是 Day 4 的今日总结：自定义消息接口、系统状态发布者实战（含两次排错全过程）、编译生效规则、VSCode 效率技巧、今日认知。
> 相关详细笔记：《ROS2 自定义消息接口》《ROS2 学习笔记（Day 3）话题通信基础与 turtlesim 实操》
> 对应主教程：《ROS2 入门实践全流程教程》第 6 章（自定义消息）

---

## 一、今日概览

| 主题 | 内容 | 状态 |
|------|------|------|
| 自定义消息 | .msg 字段清单 + 5 步流程 + 固定模板 | ✅ 已写详细笔记 |
| 实战 | 系统状态发布者（CPU/内存/网络） | ✅ 跑通 |
| 排错 | 两个 bug 从报错到修复 | ✅ 全流程走通 |
| 编译规则 | build/source/symlink-install | ✅ |
| 工具 | VSCode 扩展/着色/工作空间管理 | ✅ |

---

## 二、自定义消息接口（摘要）

**一句话**：内置消息不够用时，自己造一个"专属信封"——`.msg` 文件就是一张字段清单。

```text
# RobotStatus.msg
string robot_name
float64 x
float64 y
bool is_busy
```

**流程**：创建接口包（ament_cmake）→ 写 .msg → 改 package.xml（固定 3 行）→ 改 CMakeLists → build + source。

**为什么复杂**：消息要跨语言（Python/C++ 都能用），靠代码生成器自动印出各语言版本——你只要按模板配置，不用理解生成器。

> 详细步骤和可复制模板见《ROS2 自定义消息接口.md》

---

## 三、实战：系统状态发布者（今日重点）

### 项目是什么

一个节点每秒发布一次**系统状态**：CPU 使用率、内存、网络流量——消息用的是**自定义消息** `status_interfaces/msg/SystemStatus`（今天刚学的就用上了）。

### 踩的第一个坑：入口点模块名对不上

**报错**：

```
ModuleNotFoundError: No module named 'status_publisher.sys_status'
```

**原因**：setup.py 里入口点写的是：

```python
'sys_status_pub = status_publisher.sys_status.pub:main'
#                  ↑ 意思是"sys_status/ 目录下的 pub.py"
```

但实际文件是 `sys_status_pub.py`（**一个文件**，不是目录+pub.py）。

**规则**：入口点里的"点"= 一层目录/文件，必须和实际结构逐层对上。

```
sys_status.pub  → sys_status/ 目录下的 pub.py   ❌
sys_status_pub  → sys_status_pub.py 这个文件    ✅
```

### 踩的第二个坑：rclpy.spin() 缺参数

**报错**：

```
TypeError: spin() missing 1 required positional argument: 'node'
```

**原因**：代码里写的是 `rclpy.spin()`，少了节点参数。

**规则**：`rclpy.spin(node)` 必须告诉它"让哪个节点转起来"。

```python
node = SysStatusPub("sys_status_pub")
rclpy.spin(node)     # ✅ 模板就是 spin(node)
```

### 排错方法论（今天走通的全流程）

```
看报错 → 定位文件 → 找原因 → 修 → colcon build → source → 验证
```

**关键**：报错信息是最强的线索——`No module named` 直接告诉你"模块路径错了"，`missing argument` 直接告诉你"参数漏了"。别怕报错，报错是老师。

---

## 四、编译生效规则（今天彻底搞懂）

```
src/（源码）  →  colcon build  →  install/（成品，ros2 run 用的是它）
```

| 你改了 | 要不要重新 build | 原因 |
|--------|----------------|------|
| setup.py 入口点 | **必须** | install/ 里的入口脚本从它生成 |
| .py 源码（普通 build） | 必须 | 源码要重新拷贝进 install/ |
| 消息 .msg | 必须 | 生成器重跑，用它的包也重编 |

**偷懒神器**：

```bash
colcon build --symlink-install
```

install/ 里的 Python 文件变成指向 src/ 的链接——**改 .py 源码不用重新 build**。但改入口点仍然要 build。

**万能排查**："改了没生效" → 90% 是没 `colcon build` + `source install/setup.bash`。

---

## 五、VSCode 效率技巧（今日整理）

| 问题 | 解法 |
|------|------|
| Python 没高亮 | 装 Python 扩展（注意**装到 WSL 端**） |
| 变量/类型没颜色 | 检查 `editor.semanticHighlighting.enabled` = auto |
| 命令面板搜不到设置 | `Ctrl+Shift+P` 搜的是命令；**设置用 `Ctrl+,` 或 settings.json** |
| 复制彩色代码 | 选中 → `Ctrl+Shift+P` → "Copy with Syntax Highlighting" → 粘到 Word/网页 |
| home 看着乱 | VSCode 直接 **Open Folder 打开工作空间**，别开 home |
| home 里的隐藏目录 | 软件自动建的（.ros/.gazebo/.vscode-server…），正常别删 |
| map.pgm/map.yaml 散落 | `mkdir -p ~/maps && mv` 收进专门目录 |

---

## 六、今日认知（对话里聊透的几个观念）

1. **开源项目 ≠ 必须读的代码**：turtlebot3 对你 = 平台（simulations 造世界 + 主仓库提供现成功能），你的任务是写它没有的（如巡逻节点）
2. **"调包"没含金量？不对**：含金量在调参、集成、定制、诊断——"让导航稳定工作"才是功夫
3. **发论文 ≠ 全部手搓**：复用 90% + 创新 10%，贡献那 10% 明确可验证就行
4. **写代码没思路？**：思路 = 5 问模板（干什么/要什么数据/输出什么/何时干活/状态怎么变）+ 伪代码 + 翻译，不是凭空想
5. **ROS2 学多久**：核心 2-3 周（已完成 80%），生态按需查——不用"学完"

---

## 七、今日自查

1. 自定义消息的 .msg 是什么？→ 字段清单
2. 入口点路径写错会报什么？→ `No module named '包名.xxx'`（xxx=写错的名字）
3. spin 缺参数报什么？→ `spin() missing ... 'node'`
4. 改 setup.py 要不要重新 build？→ 必须
5. 改 .py 源码想免重编？→ `colcon build --symlink-install`
6. VSCode 该打开什么目录？→ 工作空间，不是 home
