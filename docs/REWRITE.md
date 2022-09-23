# 原生方法重写原理

折叠是haskell里很原子的函数，可以派生出很多数组操作的函数，其中右折叠（相当于js的reduce）的定义是：

```hs
foldr :: (a -> b -> b) -> b -> [a] -> b
foldr f z [] = z
foldr f z (x:xs) = f x (foldr f z xs)
```

所有数组操作，都可以基于foldr派生，比如map：

```hs
map :: a -> b -> [a] -> [b]
map f = foldr ((:) . f) []
```

由于map的操作函数f可能抛出中断信号，普通map无法阻塞后续f运行。定义类型类P代表断点信号，此时map：

```hs
map :: a -> (P b) -> [a] -> [P b]
```

可以看到，他仅仅会阻塞某个元素操作的执行。但这不符合我们预期，假设gmap是重写后的map函数，我们希望的行为应该是：

```hs
gmap :: a -> (P b) -> [a] -> (P [b])
```

因此，需要定义两个函数来进行复合，分别用于等待恢复和触发中断：

```hs
y :: P a -> a
y (P a) = a
g :: a -> P a
g a = P a
```

所以，实际上gmap的定义是：

```hs
gmap :: a -> (P b) -> [a] -> (P [b])
gmap f = foldr (g . (:) . f . y) (P [])
```

简单对比一下map和gmap的定义不难发现，如果我们能以foldr来声明对应的函数，那么只需要在foldr的操作函数f执行前，先用y展开输入，在返回前重新用g包裹起来。通过这样的复合，就得到了能理解中断信号并阻塞执行的协程函数：

```hs
map f = foldr ((:) . f) []
gmap f = foldr (g . (:) . f . y) (P [])
```

对于js中的forEach、filter、reduce、replace等方法，也是类似：

```hs
each f = foldr f []
geach f = foldr (g . f . y) (P [])

filter f = foldr (\x xs -> if (f x) then x:xs else xs) []
gfilter f = foldr (\x xs -> if ((f . y) x) then (g x:xs) else (g xs)) (P [])

reduce = foldr
greduce f x = folder (g . f . y) (P x)

replace f r = foldr (\x xs -> if (f x) then (r x):xs else x:xs) []
greplace f r = foldr (\x xs -> if ((f . y) x) then (g (r x):xs) else (g x:xs)) (P [])
```

那么，根据上述推导，以js的map为例，可以进行以下重写：

```js
// 基于foldr也就是reduce实现的原生等效map
Array.prototype.map = function map(mapper) {
  return Array.prototype.reduce.call(this, (prev, ...args) => {
    const res = mapper(...args); // 执行 f 函数
    prev.push(res); // 执行 (:) 拼接
    return prev;
  }, []); // 初始值采用 []
};
// 重写成协程后的gmap
Array.prototype.map = function map(mapper) {
  return executor(Array.prototype.reduce.call(this, (prevGenerator, ...args) => {
    return (function* () {
      const prev = yield* prevGenerator; // 先用 y 展开前者中断信号，等待恢复
      const res = yield mapper(...args); // 执行 f 函数，注意加上 yield 保证中断信号拋出
      prev.push(res); // 执行 (:) 拼接
      return prev;
    })(); // 最后用 g 重新包裹，允许触发中断
  }, (function* () { return [] })())); // 初始值采用 P[]
};
```
