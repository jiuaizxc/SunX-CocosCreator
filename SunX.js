var SunX = {};

SunX.SEvent = {
    RES_LOAD_OVER: 9000000000
};

var _SEventEntry = cc._Class.extend({
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
var _SEventManager = cc._Class.extend({
    _hashForEntry: null,
    _hashListener: null,
    _removeArray: null,
    _isRemoveDirty: false,

    ctor: function () {
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
     * target对象一定要是继承自cc.Class/cc._Class类才能够注册
     * 同一个target对象上不能注册事件名称相同的事件
     *
     * @method AddEvent
     * @param {Number} tag - 事件名称(注意tag>=9000000000的名称被SunX引擎暂用)
     * @param {Function} handler - 事件回调函数
     * @param {Object} target - 事件调用的对象
     **/
    AddEvent: function (tag, handler, target) {
        cc.assert(cc.js.isNumber(tag), "tag no Number");

        let instanceId = this._getTargetId(target);
        let element = this._hashForEntry[instanceId];

        if(!element) {
            element = [];
            this._hashForEntry[instanceId] = element;
        }

        let entry = this._findTagToEntry(element, tag);

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
     * target对象一定要是继承自cc.Class/cc._Class类才能够注册
     *
     * @method RemoveEvent
     * @param {Number} tag - 事件名称
     * @param {Object} target - 事件调用的对象
     **/
    RemoveEvent: function (tag, target) {
        let instanceId = this._getTargetId(target);
        let element = this._hashForEntry[instanceId];

        if (!element) return;


        let entry = this._findTagToEntry(entryArr, tag);
        if (!entry || !entry.isDirty) return;


        entry.isDirty = true;
        this._removeArray.push(entry);
        this._isRemoveDirty = true;
    },

    /**
     * 移除所有事件。
     *
     * target对象一定要是继承自cc.Class/cc._Class类才能够注册
     *
     * @method RemoveAllEvent
     * @param {Object} target - 事件调用的对象
     **/
    RemoveAllEvent: function (target) {
        let instanceId = this._getTargetId(target);
        let element = this._hashForEntry[instanceId];

        if (!element) return;

        let len = element.length;
        if (0 == len) return;

        let entry = null;
        for (let i = 0; i < len; ++ i) {
            entry = element[i];
            if (entry.isDirty) continue;
            entry.isDirty = true;
            this._removeArray.push(entry);
        }

        this._isRemoveDirty = true;
    },

    _update: function (dlt) {
        if (this._isRemoveDirty) {
            let instanceId = 0;
            let element = null;
            let entry = null;
            let arr = null;
            let size = 0;

            let len = this._removeArray.length;

            while (--len >= 0) {
                entry = this._removeArray[len];
                arr = this._hashListener[entry.tag];

                if (arr) {
                    instanceId = this._getTargetId(entry.target);
                    element = this._hashForEntry[instanceId];
                    if(!element) continue;

                    size = element.length;
                    this._arrRemoveItem(element, entry, size);
                    if (1 == size) delete this._hashForEntry[instanceId];


                    size = element.length;
                    this._arrRemoveItem(arr, entry, size);
                    if (1 == size) delete this._hashListener[entry.tag];

                }
            }

            this._removeArray.length = 0;
            this._isRemoveDirty = false;
        }
    },

    _addListenerMap: function (tag, handler, target) {
        let entryArr = this._hashListener[tag];

        if (!entryArr) {
            entryArr = [];
            this._hashListener[tag] = entryArr;
        }

        let entry = new _SEventEntry();
        entry.InitData(tag, handler, target);
        entryArr.push(entry);
        return entry;
    },

    _findTargetToEntry: function (arr, target) {
        let len = arr.length;
        for (let i = 0; i < len; ++ i) {
            if (target == arr[i].target) return arr[i];
        }
        return null;
    },

    _findTagToEntry: function (arr, tag) {
        let len = arr.length;
        for (let i = 0; i < len; ++ i) {
            if (tag == arr[i].tag) return arr[i];
        }
        return null;
    },

    _arrRemoveItem: function (arr, item, len) {
        if (1 == len) {
            arr.pop();
        } else {
            let index = arr.indexOf(item);
            if (index == -1) return;

            if (len - 1 == index) {
                arr.pop();
            } else {
                arr[index] = arr.pop();
            }
        }
    },

    _getTargetId: function (target) {
        return target.__instanceId || target.uuid;
    },
});

var _SResItem = cc._Class.extend({
    _uuid: null,
    _loadUrl: null,
    _fullPath: null,
    _type: null,
    _spriteFrameName: null,
    _sceneData: null,
    _callFunc: null,

    ctor: function (uuid, loadUrl, fullPath, type) {
        this._uuid = uuid;
        this._loadUrl = loadUrl;
        this._fullPath = fullPath;
        this._type = type;

        this._spriteFrameName = "";
        this._sceneData = [];
        this._callFunc = null;
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

SunX.sRes = null;
var _SResManager = cc._Class.extend({
    _pathItemHash: null,
    _uuidItemHash: null,
    _spriteFrameCache: null,

    _totalNum: -1,
    _count: -1,

    _cacheRes: null,
    _cacheSceneRes: null,
    _curScene: null,

    ctor: function () {
        this._pathItemHash = {};
        this._uuidItemHash = {};
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
        if (!rawAssets) return;

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

                item = new _SResItem(uuid, loadUrl, fullPath, type);

                this._pathItemHash[url] = item;
                this._uuidItemHash[uuid] = item;
            }
        }

        if(window) window._CCSettings = undefined;
        _CCSettings = undefined;
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
            this._releaseOne(item);
        }

        this.PurgeCachedRes();
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
     * @param {String|Object|Array} resources - 文件路径/者文件路径的数组
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
            } else {
                item = this._pathItemHash[path.url];
                item._callFunc = path.func;
            }

            if (!item) {
                resources[i] = undefined;
            } else {
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
            let map = loadItem.map;
            let data;
            let item;
            for (var key in map) {
                item = map[key];
                data = loadItem.getContent(key);
                if (data) {
                    // should not release these assets, even if they are static referenced in the scene.
                    cc.loader.setAutoReleaseRecursively(key, false);
                    self._loadOver(error, key, item.url, data, item.dependKeys);
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

            if (item._callFunc) item._callFunc(asset);
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
        for (let key in spriteFrames) {
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

        var sceneInfo = cc.director._getSceneUuid(scene.name);

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

SunX.sUserData = null;
var _SUserData = cc._Class.extend({
    _saveFunc: null,
    _readFunc: null,
    
    ctor: function () {
        this._saveFunc = this._webSave;
        this._readFunc = this._webRead;
    },

    FindFile: function (fileName) {
        if (cc.sys.localStorage.getItem(fileName)) return true;
        else return false;
    },

    SaveUserData: function (fileName, data) {
        this._saveFunc(fileName, data);
    },
    
    ReadUserData: function (fileName) {
        return this._readFunc(fileName);
    },
    
    _webSave: function (fileName, data) {
        cc.sys.localStorage.setItem(fileName, data);
    },

    _webRead: function (fileName) {
        return cc.sys.localStorage.getItem(fileName);
    },

    _nativeSave: function (fileName, data) {

    },

    _nativeRead: function (fileName, data) {

    }
});

cc.game.on(cc.game.EVENT_GAME_INITED, function () {
    SunX.sEventManager = new _SEventManager();
    SunX.sRes = new _SResManager();
    SunX.sUserData = new _SUserData();

    cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function(event) {
        SunX.sRes._onSceneLaunch(event.detail);
    });

    SunX.sRes._initRes();
});