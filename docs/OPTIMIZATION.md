# 优化记录

环境：
Macbook Pro 2021

项目：
- For循环10000次 (Node 16)
- React初始化 (Node 16)
- React Demo页渲染 (Chrome 121)
- React Demo页点击事件处理 (Chrome 121)

原生：
- 0.2ms
- 1.8ms
- 1.3ms
- 1ms

原始效果：
- 23.4ms
- 11.1ms
- 10.6ms
- 6.2ms

## 第一次优化

优化项：
- 原来每一行都yield出来再判断是否断点，改成先判断断点再yield出来，减少generator保存状态的性能消耗

优化效果：
- 17.2ms (-26.5%)
- 10ms (-9.9%)
- 6ms (-43.4%)
- 5ms (-19.4%)
