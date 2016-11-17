var SunX = {};

SunX.SEvent = {
    RES_LOAD_OVER: 9000000000
};

SunX._SEventEntry = cc._Class.extend({
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
SunX._SEventManager = cc._Class.extend({
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

    ExecuteEvent: function (Tag, Data) {
        var arr = this._hashListener[Tag];
        var len = arr.length;
        var entry = null;
        for (var i = 0; i < len; ++ i) {
            entry = arr[i];
            if (entry.isDirty) continue;
            entry.Execute({tag:Tag, data:Data});
        }
    },

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

        let entry = new SunX._SEventEntry();
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

SunX._SResItem = cc._Class.extend({
    _uuid: null,
    _loadUrl: null,
    _fullPath: null,
    _type: null,
    _spriteFrameName: null,
    _sceneData: null,

    ctor: function (uuid, loadUrl, fullPath, type) {
        this._uuid = uuid;
        this._loadUrl = loadUrl;
        this._fullPath = fullPath;
        this._type = type;


        this._spriteFrameName = "";
        this._sceneData = [];
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
    }
});

SunX.sRes = null;
SunX._SResManager = cc._Class.extend({
    _pathItemHash: null,
    _uuidItemHash: null,
    _spriteFrameCache: null,

    _totalNum: -1,
    _count: -1,

    ctor: function () {
        this._pathItemHash = {};
        this._uuidItemHash = {};
        this._spriteFrameCache = {};

        this._totalNum = -1;
        this._count = -1;
    },

    _initRes: function () {
        var settings = window._CCSettings;
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

                item = new SunX._SResItem(uuid, loadUrl, fullPath, type);

                this._pathItemHash[url] = item;
                this._uuidItemHash[uuid] = item;
            }
        }

        window._CCSettings = undefined;
        _CCSettings = undefined;
    },

    GetSpriteFrame: function (name) {
        return this._spriteFrameCache[name];
    },

    GetRes: function (path) {
        var item = this._pathItemHash[path];
        if (!item) return null;
        return cc.loader.getRes(item.GetUUID());
    },

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
    },
    
    Load: function (resources) {
        if (!(resources instanceof Array)) {
            resources = resources ? [resources] : [];
        }

        var path;
        var item;
        for (var i = 0; i < resources.length; ++i) {
            path = resources[i];
            item = this._pathItemHash[path];
            if (!item) {
                resources[i] = undefined;
            } else {
                if (cc.isChildClassOf(item._type, cc.Asset)) {
                    resources[i] = {id: item._loadUrl, type: 'uuid', uuid: item._loadUrl};
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
            let item;
            for (var uuid in map) {
                item = loadItem.getContent(uuid);
                if (item) {
                    // should not release these assets, even if they are static referenced in the scene.
                    cc.loader.setAutoReleaseRecursively(uuid, false);
                    self._loadOver(error, item);
                }
            }
        });
    },

    _loadOver: function (error, asset) {
        var item = null;
        if (asset.hasOwnProperty("_uuid")) {
            item = this._uuidItemHash[asset._uuid];
        }

        if (item) {
            if (item.GetType() == cc.SpriteFrame) {
                this._spriteFrameCache[asset.name] = asset;
                item._spriteFrameName = asset.name;
            } else if (item.GetType() == cc.SpriteAtlas) {
                this._loadSpriteAtlas(asset);
            } else if (item.GetType() == cc.SceneAsset) {
                var arr = cc.loader.getDependsRecursively(asset);
                Array.prototype.push.apply(item._sceneData, arr);
            }
        }

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

        if (item.GetType() == cc.SpriteFrame) {
            delete this._spriteFrameCache[item._spriteFrameName];
            let temp = cc.loader.getDependsRecursively(item.GetLoadUrl());
            cc.loader.release(temp);
        } else if (item.GetType() == cc.SpriteAtlas) {
            let atlas = cc.loader.getRes(item.GetLoadUrl());
            if (atlas) this._releaseSpriteAtlas(atlas);
        } else if (item.GetType() == cc.BitmapFont) {
            let asset = cc.loader.getRes(item.GetLoadUrl());
            if (asset) this._releaseBitmapFont(asset);
        } else if (item.GetType() == cc.Prefab) {
            let asset = cc.loader.getRes(item.GetLoadUrl());
            if (asset) this._releasePrefab(asset);
        } else if (item.GetType() == cc.SceneAsset) {
            this._releaseScene(item);
        } else {
            cc.loader.release(item.GetLoadUrl());
            if (item._uuid != item._loadUrl) {
                cc.loader.release(item._uuid);
            }
        }
    },

    _releaseSpriteAtlas: function (atlas) {
        var spriteFrames = atlas._spriteFrames;
        for (var key in spriteFrames) {
            delete this._spriteFrameCache[key];
        }
        var temp = cc.loader.getDependsRecursively(atlas);
        cc.loader.release(temp);
    },

    _releaseBitmapFont: function (asset) {
        var arr = asset.rawUrls;
        var len = arr.length;
        for (var i = 0; i < len; ++ i) {
            cc.loader.release(arr[i]);
        }

        var temp = cc.loader.getDependsRecursively(asset);
        cc.loader.release(temp);
    },

    _releasePrefab: function (asset) {
        var uuid;
        var arr = cc.loader.getDependsRecursively(asset);
        var len = arr.length;
        for (var i = 0; i < len; ++ i) {
            uuid = arr[i];
            if (uuid == asset._uuid) continue;
            this._releaseOne(this._uuidItemHash[uuid]);
        }
        cc.loader.release(asset);
    },

    _releaseScene: function (item) {
        var arr = item._sceneData;
        var len = arr.length;
        for (var i = 0; i < len; ++ i) {
            uuid = arr[i];
            if (uuid == item._uuid) continue;
            this._releaseOne(this._uuidItemHash[uuid]);
        }
        cc.loader.release(item._uuid);
        item._sceneData.length = 0;
    }
});

SunX.sUserData = null;
SunX._SUserData = cc._Class.extend({
    _saveFunc: null,
    _readFunc: null,
    
    ctor: function () {
        /*if (cc.sys.isNative)
        {
            this._saveFunc = this._nativeSave;
            this._readFunc = this._nativeRead;
        }
        else
        {
            this._saveFunc = this._webSave;
            this._readFunc = this._webRead;
        }*/

        this._saveFunc = this._webSave;
        this._readFunc = this._webRead;
    },

    FindFile: function (fileName) {
        /*if (cc.sys.isNative)
        {
            fileName = jsb.fileUtils.getWritablePath() + fileName + ".sm";
            return jsb.fileUtils.isFileExist(fileName);
        }
        else
        {
            if (cc.sys.localStorage.getItem(fileName)) return true;
            else return false;
        }*/

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

SunX.SInit = function () {
    SunX.sEventManager = new SunX._SEventManager();
    SunX.sRes = new SunX._SResManager();
    SunX.sUserData = new SunX._SUserData();

    SunX.sRes._initRes();
};

SunX.SChangeScene = function (sceneName) {
    cc.director.loadScene(sceneName, function (error, scene) {
        var item = SunX.sRes._uuidItemHash[scene.uuid];
        if (item._sceneData.length > 0) return;
        Array.prototype.push.apply(item._sceneData, scene.dependAssets);
    });
};

//module.exports = SunX;