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

