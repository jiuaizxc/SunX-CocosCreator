var SunX = {};
window.SunX = SunX;

SunX.SEvent = {
    RES_LOAD_OVER: "RES_LOAD_OVER"
};

SunX._isGC = false;
SunX._destroySceneName = null;

/**
* 调用垃圾回收
**/
SunX.GC = function () {
    SunX._isGC = true;
};

/**
* 摧毁场景
**/
SunX.DestroyScene = function (sceneName) {
    SunX._destroySceneName = sceneName;
    SunX._isGC = true;
};

SunX._SEventEntry = cc.Class({
    ctor: function () {
        this.tag = 0;
        this.target = null;
        this.func = null;
        this.isDirty = false;
    },

    InitData: function (Tag, Func, Target) {
        this.tag = Tag;
        this.target = Target;
        this.func = Func;
    },
    
    Execute: function (event) {
        this.func.call(this.target, event);
    }
});

SunX.sEventManager = null;
SunX.ClassEventID = 1;
SunX.__getClassEventID = function () {
    return SunX.ClassEventID ++;
};

SunX._SEventManager = cc.Class({

    ctor: function () {
        this.__instanceId = cc.ClassManager.getNewInstanceId();
        this._hashForEntry = {};
        this._hashListener = {};
        this._removeArray = [];
        this._isRemoveDirty = false;

        cc.director.getScheduler().schedule(this._update, this, 0, cc.macro.REPEAT_FOREVER, 0, false);
    },

    /**
     * 发送事件。
     * @method ExecuteEvent
     * @param {Number} Tag - 事件名称
     * @param {Object} Data - 用户数据
     **/
    ExecuteEvent: function (Tag, Data) {
        var arr = this._hashListener[Tag];
        if (arr) {
            var len = arr.length;
            var entry = null;
            for (var i = 0; i < len; ++ i) {
                entry = arr[i];
                if (entry.isDirty) continue;
                entry.Execute({tag:Tag, data:Data});
            }
        }
    },

    /**
     * 注册事件。
     *
     * 同一个target对象上不能注册事件名称相同的事件
     *
     * @method AddEvent
     * @param {Number} tag - 事件名称
     * @param {Function} handler - 事件回调函数
     * @param {Object} target - 事件调用的对象
     **/
    AddEvent: function (tag, handler, target) {
        var instanceId = this._getTargetId(target);
        var element = this._hashForEntry[instanceId];

        if(!element) {
            element = [];
            this._hashForEntry[instanceId] = element;
        }

        var entry = this._findTagToEntry(element, tag);

        if (entry) {
            if (entry.isDirty) {
                entry.isDirty = false;
                cc.js.array.remove(this._removeArray, entry);
            }
            return;
        }

        entry = this._addListenerMap(tag, handler, target);
        element.push(entry);
    },

    /**
     * 移除单个事件。
     *
     *
     * @method RemoveEvent
     * @param {Number} tag - 事件名称
     * @param {Object} target - 事件调用的对象
     **/
    RemoveEvent: function (tag, target) {
        var instanceId = this._getTargetId(target);
        var element = this._hashForEntry[instanceId];

        if (!element) return;


        var entry = this._findTagToEntry(element, tag);
        if (!entry || entry.isDirty) return;


        entry.isDirty = true;
        this._removeArray.push(entry);
        this._isRemoveDirty = true;
    },

    /**
     * 移除所有事件。
     *
     *
     * @method RemoveAllEvent
     * @param {Object} target - 事件调用的对象
     **/
    RemoveAllEvent: function (target) {
        var instanceId = this._getTargetId(target);
        var element = this._hashForEntry[instanceId];

        if (!element) return;

        var len = element.length;
        if (0 == len) return;

        var entry = null;
        for (var i = 0; i < len; ++ i) {
            entry = element[i];
            if (entry.isDirty) continue;
            entry.isDirty = true;
            this._removeArray.push(entry);
        }

        this._isRemoveDirty = true;
    },

    _update: function (dlt) {
        if (this._isRemoveDirty) {
            var instanceId = 0;
            var element = null;
            var entry = null;
            var arr = null;
            var size = 0;

            var len = this._removeArray.length;

            while (--len >= 0) {
                entry = this._removeArray[len];
                arr = this._hashListener[entry.tag];

                if (arr) {
                    instanceId = this._getTargetId(entry.target);
                    element = this._hashForEntry[instanceId];
                    if(!element) continue;

                    size = element.length;
                    this._arrRemoveItem(element, entry, size);
                    this._arrRemoveItem(arr, entry, arr.length);
                    if (1 == size) delete this._hashForEntry[instanceId];
                }
            }

            this._removeArray.length = 0;
            this._isRemoveDirty = false;
        }
    },

    _addListenerMap: function (tag, handler, target) {
        var entryArr = this._hashListener[tag];

        if (!entryArr) {
            entryArr = [];
            this._hashListener[tag] = entryArr;
        }

        var entry = new SunX._SEventEntry();
        entry.InitData(tag, handler, target);
        entryArr.push(entry);
        return entry;
    },

    _findTargetToEntry: function (arr, target) {
        var len = arr.length;
        for (var i = 0; i < len; ++ i) {
            if (target == arr[i].target) return arr[i];
        }
        return null;
    },

    _findTagToEntry: function (arr, tag) {
        var len = arr.length;
        for (var i = 0; i < len; ++ i) {
            if (tag == arr[i].tag) return arr[i];
        }
        return null;
    },

    _arrRemoveItem: function (arr, item, len) {
        if (1 == len) {
            arr.pop();
        } else {
            var index = arr.indexOf(item);
            if (index == -1) return;

            if (len - 1 == index) {
                arr.pop();
            } else {
                arr[index] = arr.pop();
            }
        }
    },

    _getTargetId: function (target) {
        if (target.__sunxeventID) return target.__sunxeventID;
        target.__sunxeventID = SunX.__getClassEventID();
        return target.__sunxeventID;
    },
});

SunX._SResItem = cc.Class({

    ctor: function () {
        this._uuid = null;
        this._loadUrl = null;
        this._fullPath = null;
        this._type = null;

        this._spriteFrameName = "";
        this._sceneData = [];
        this._callFunc = null;

        this.LoadingType = 0;
    },

    Init: function (uuid, loadUrl, fullPath, type) {
        this._uuid = uuid;
        this._loadUrl = loadUrl;
        this._fullPath = fullPath;
        this._type = type;

        this._spriteFrameName = "";
        this._sceneData = [];
        this._callFunc = null;

        this.LoadingType = 0;
    },

    GetUUID: function () {
        return this._uuid;
    },

    GetLoadUrl: function () {
        return this._loadUrl;
    },

    GetFullPath: function () {
        return this._fullPath;
    },

    GetType: function () {
        return this._type;
    },
    
    GetResID: function () {
        return this._loadUrl;
    }
});

SunX._SResManager = cc.Class({

    ctor: function () {
        this._pathItemHash = {};
        this._uuidItemHash = {};
        this._sceneHash = {};

        this._spriteFrameCache = {};

        this._totalNum = -1;
        this._count = -1;

        this._cacheRes = {};
        this._cacheSceneRes = {};
        this._curScene = null;
    },

    _initRes: function () {
        var settings = undefined;
        if (window) settings = window._CCSettings;
        if (!settings) settings = _CCSettings;

        var rawAssets = settings.rawAssets;
        if (rawAssets) this._parseResData(rawAssets);

        var scenes = settings.scenes;
        if (scenes) this._parseSceneData(scenes);

        if(window) window._CCSettings = undefined;
        _CCSettings = undefined;
    },

    _parseSceneData: function (scenes) {
        var len = scenes.length;
        var obj = null;
        var scenesName = null;
        var index1 = -1;
        var index2 = -1;
        for (var i = 0; i < len; ++ i) {
            obj = scenes[i];
            scenesName = obj.url;
            index1 = scenesName.lastIndexOf("/");
            index2 = scenesName.lastIndexOf(".fire");
            this._sceneHash[obj.uuid] = scenesName.slice(index1 + 1, index2);
        }
    },

    _parseResData: function (rawAssets) {
        rawAssets = rawAssets.assets;
        var RES_DIR = 'resources/';

        var info;
        var url;
        var typeId;
        var type;
        var fullPath;
        var loadUrl;
        var item;

        for (var uuid in rawAssets) {
            info = rawAssets[uuid];
            fullPath = info[0];
            typeId = info[1];
            type = cc.js._getClassById(typeId);

            if (!type) {
                cc.error('Cannot get', typeId);
                continue;
            }

            if (fullPath.startsWith(RES_DIR)) {
                url = fullPath.slice(RES_DIR.length);
                if (cc.isChildClassOf(type, cc.Asset)) {
                    loadUrl = uuid;
                } else {
                    loadUrl = cc.url.raw(fullPath);
                }

                item = new SunX._SResItem();
                item.Init(uuid, loadUrl, fullPath, type);

                this._pathItemHash[url] = item;
                this._uuidItemHash[uuid] = item;
            }
        }
    },

    /**
     * 获取精灵帧。
     * @method GetSpriteFrame
     * @param {String} name - 精灵帧文件名称
     **/
    GetSpriteFrame: function (name) {
        return this._spriteFrameCache[name];
    },

    /**
     * 获取资源。
     * @method GetRes
     * @param {String} path - 文件路径
     **/
    GetRes: function (path) {
        var item = this._pathItemHash[path];
        if (!item) return null;
        var url = cc.loader._getReferenceKey(item.GetLoadUrl());
        return cc.loader.getRes(url);
    },

    /**
     * 获取resources下某个目录中的所有文件uuid数组。
     * @method GetRes
     * @param {String} path - 文件路径
     **/
    GetResDir: function (path) {
        return cc.loader._resources.getUuidArray(path, null);
    },

    /**
     * 释放资源。
     * @method ReleaseRes
     * @param {String|Array} resources - 文件路径/者文件路径的数组
     **/
    ReleaseRes: function (resources) {
        if (!(resources instanceof Array)) {
            resources = resources ? [resources] : [];
        }

        var path;
        var item;
        for (var i = 0; i < resources.length; ++i) {
            path = resources[i];
            item = this._pathItemHash[path];

            if (!item) continue;

            if (item.LoadingType == 1) {
                item.LoadingType = 0;
                continue;
            }

            this._releaseOne(item);
        }
    },

    /**
     * 释放掉没有勾选自动释放选项场景的资源
     *
     * @method ReleaseSceneRes
     * @param {String} sceneName - 场景的名称(如果为空,清楚所有已切换过的场景的资源)
     *
     **/
    ReleaseSceneRes: function (sceneName) {
        if (sceneName == undefined) {
            for (var key in this._cacheSceneRes) {
                this._subCacheResArray(this._cacheSceneRes[key]);
                delete this._cacheSceneRes[key];
            }
        } else {
            var list = this._cacheSceneRes[sceneName];
            delete this._cacheSceneRes[sceneName];
            if (!list) return;
            this._subCacheResArray(list);
        }

        this.PurgeCachedRes();
    },

    /**
     *
     * 清空缓存资源
     *
     * @method PurgeCachedRes
     *
     **/
    PurgeCachedRes: function () {
        for (var key in this._cacheRes) {
            if (this._cacheRes[key] == 0) {
                cc.loader.release(key);
                delete this._cacheRes[key];
            }
        }
    },

    /**
     * 加载资源。
     *
     * @method Load
     * @param {String|Object|Array} resources - 文件路径/文件对象/文件路径的数组
     **/
    Load: function (resources) {
        if (!(resources instanceof Array)) {
            resources = resources ? [resources] : [];
        }

        var len = resources.length;
        if (0 == len) return;

        var path;
        var item;
        for (var i = 0; i < len; ++i) {
            path = resources[i];


            if (typeof path === 'string') {
                item = this._pathItemHash[path];
                if (!item) item = this._uuidItemHash[path];
            } else {
                item = this._pathItemHash[path.url];
                if (!item) item = this._uuidItemHash[path.url];
                item._callFunc = path.func;
            }

            if (!item) {
                resources[i] = undefined;
            } else {
                item.LoadingType = 1;
                if (cc.isChildClassOf(item._type, cc.Asset)) {
                    resources[i] = {type: 'uuid', uuid: item._loadUrl};
                } else {
                    resources[i] = item._loadUrl;
                }
            }
        }

        if (-1 == this._count) this._count = 0;

        if (-1 == this._totalNum) this._totalNum = resources.length;
        else this._totalNum += resources.length;


        var self = this;
        cc.loader.load(resources, function (error, loadItem) {
            var map1 = loadItem.map;
            var data1;
            var item1;
            for (var key in map1) {
                item1 = map1[key];
                data1 = loadItem.getContent(key);
                if (data1) {
                    // should not release these assets, even if they are static referenced in the scene.
                    cc.loader.setAutoReleaseRecursively(key, false);
                    self._loadOver(error, key, item1.url, data1, item1.dependKeys);
                }
            }
        });
    },

    _loadOver: function (error, key, url, asset, dependKeys) {
        var item = this._uuidItemHash[key];
        if (!item) item = this._uuidItemHash[asset._uuid];

        if (!item) {
            var index = key.indexOf("resources");
            if (index >= 0) {
                var path = key.slice(index + 10);
                item = this._pathItemHash[path];
            }
        }

        if (item) {

            if (item.LoadingType == 0) {
                depends = cc.loader.getDependsRecursively(asset);
                cc.loader.release(depends);

                item._callFunc = null;
                this._loadCount();
                return;
            }

            item.LoadingType = 2;

            var depends;
            if (item.GetType() == cc.SpriteFrame) {
                this._spriteFrameCache[asset.name] = asset;
                item._spriteFrameName = asset.name;

                this._addCacheRes(url);
                this._addCacheResArray(dependKeys);
            } else if (item.GetType() == cc.SpriteAtlas) {
                depends = cc.loader.getDependsRecursively(asset);
                this._addCacheResArray(depends);
                this._loadSpriteAtlas(asset);
            } else if (item.GetType() == cc.SceneAsset) {
                depends = cc.loader.getDependsRecursively(asset);
                Array.prototype.push.apply(item._sceneData, depends);
                if (this._cacheSceneRes[asset.name]) delete this._cacheSceneRes[asset.name];
                this._addCacheResArray(depends);
            } else if (item.GetType() == cc.AudioClip) {
                this._totalNum += 1;
                this._addCacheRes(url);
                cc.audioEngine.preload(url, function (b) {
                    SunX.sRes._loadCount();
                });
            } else {
                depends = cc.loader.getDependsRecursively(key);
                this._addCacheResArray(depends);
            }

            if (item._callFunc) {
                item._callFunc(asset);
                item._callFunc = null;
            }
        }

        this._loadCount();
    },

    _loadCount: function () {
        this._count += 1;
        if (this._totalNum == this._count) {
            this._count = -1;
            this._totalNum = -1;

            SunX.sEventManager.ExecuteEvent(SunX.SEvent.RES_LOAD_OVER, null);
        }
    },

    _loadSpriteAtlas: function (atlas) {
        var spriteFrames = atlas._spriteFrames;
        for (var key in spriteFrames) {
            this._spriteFrameCache[key] = spriteFrames[key];
        }
    },

    _releaseOne: function (item) {
        if (!item) return;

        var url;
        var depends;
        var asset;

        if (item.GetType() == cc.SpriteFrame) {
            delete this._spriteFrameCache[item._spriteFrameName];//删除时机,有待考虑
            depends = cc.loader.getDependsRecursively(item.GetLoadUrl());
            this._subCacheResArray(depends);
        } else if (item.GetType() == cc.SpriteAtlas) {
            url = cc.loader._getReferenceKey(item.GetLoadUrl());
            asset = cc.loader.getRes(url);
            if (asset) this._releaseSpriteAtlas(asset);
        } else if (item.GetType() == cc.SceneAsset) {
            this._releaseScene(item);
        } else if (item.GetType() == cc.AudioClip) {
            this._subCacheRes(item.GetLoadUrl());
            cc.audioEngine.uncache(item.GetLoadUrl());
        } else {
            if (item.GetType() == cc.RawAsset) {
                this._subCacheRes(item.GetLoadUrl());
            } else {
                url = cc.loader._getReferenceKey(item.GetLoadUrl());
                asset = cc.loader.getRes(url);
                if (asset) this._releaseDepends(asset);
            }
        }

        item.LoadingType = 0;
    },

    _releaseSpriteAtlas: function (atlas) {
        var spriteFrames = atlas._spriteFrames;
        for (var key in spriteFrames) {
            delete this._spriteFrameCache[key];
        }

        this._releaseDepends(atlas);
    },

    _releaseDepends: function (asset) {
        var temp = cc.loader.getDependsRecursively(asset);
        this._subCacheResArray(temp);
    },

    _releaseScene: function (item) {
        this._subCacheResArray(item._sceneData);
        item._sceneData.length = 0;
    },
    
    _onSceneLaunch: function (scene) {
        var curSave = true;

        var sceneName = this._sceneHash[scene._id];
        if (!sceneName) sceneName = scene._name;
        if (!sceneName || sceneName == "") return;

        var sceneInfo = cc.director._getSceneUuid(sceneName);
        if (!sceneInfo) return;

        if (this._cacheRes[sceneInfo.uuid]) curSave = false;
        this._curScene = scene;

        if (curSave) {
            if (!this._curScene.autoReleaseAssets) {
                if (!this._cacheSceneRes[this._curScene.name]) {
                    this._addCacheSceneRes(this._curScene);
                    this._addCacheResArray(this._curScene.dependAssets);
                }
            }
        }
    },

    _addCacheResArray: function (list) {
        var len = list.length;
        for (var i = 0; i < len; ++ i) {
            this._addCacheRes(list[i]);
        }
    },
    
    _addCacheRes: function (url) {
        var refCount = this._cacheRes[url];

        if (refCount == undefined) {
            this._cacheRes[url] = 1;
        } else {
            ++ refCount;
            this._cacheRes[url] = refCount;
        }
    },
    
    _addCacheSceneRes: function (scene) {
        var array = [];
        Array.prototype.push.apply(array, scene.dependAssets);
        this._cacheSceneRes[scene.name] = array;
    },

    _subCacheResArray: function (list) {
        var len = list.length;
        for (var i = 0; i < len; ++ i) {
            this._subCacheRes(list[i]);
        }
    },

    _subCacheRes: function (url) {
        var refCount = this._cacheRes[url];

        if (refCount == undefined) return;

        if (refCount > 0) {
            -- refCount;
            this._cacheRes[url] = refCount;
        }
    }
});

SunX.sEventManager = new SunX._SEventManager();
SunX.sRes = new SunX._SResManager();

cc.game.on(cc.game.EVENT_GAME_INITED, function () {

    cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function(event) {
        SunX.sRes._onSceneLaunch(event.detail);
    });

    cc.director.on(cc.Director.EVENT_AFTER_DRAW, function(event) {
        if (SunX._destroySceneName) {
            SunX.sRes.ReleaseSceneRes(SunX._destroySceneName);
            SunX._destroySceneName = null;
        }

        if (SunX._isGC) {
            SunX._isGC = false;
            cc.sys.garbageCollect();
        }
    });

    SunX.sRes._initRes();
});