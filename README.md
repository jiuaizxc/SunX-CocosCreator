# SunX-CocosCreator
CocosCreator SunX

此库是在CocosCreator引擎中进一步的封装。

## 如何使用

首先需要修改CocosCreator游戏引擎部分代码
1、修改CocosCreator.app/Contents/Resources/static/build-templates/shares/main.js代码
```java
   var settings = window._CCSettings;
   //window._CCSettings = undefined;//注释掉
```
2、修改CocosCreator.app/Contents/Resources/static/preview-templates/boot.js代码
```java
  //_CCSettings = undefined;//注释掉
```
3、修改CocosCreator.app/Contents/Resources/static/simulator/main.js代码
```java
  //_CCSettings = undefined;//注释掉
```
4、将SunX.js直接拷贝到CocosCreator项目中，然后将其导入为插件。

5、在程序最开始初始化的时候一定要最先初始化SunX库。
```java
  SunX.SInit();
```

## 注意
在CocosCreator引擎中切换场景：
```java
  请不要使用
  cc.director.loadScene("TestScene");
  要去使用
  SunX.SChangeScene("TestScene");
```
这是为了更好的控制资源，更好的释放掉我们不需要的资源

