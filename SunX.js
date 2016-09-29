var SunX = {};

SunX.SEventManager = cc._Class.extend({
    _allHandler: null,

    ctor: function () {
        this._allHandler = {};
    },

    AddEvent: function (tag, handler) {
        cc.assert(cc.js.isNumber(tag), "_resItems no item");
        let arr = this._allHandler[tag];
        if (arr === undefined) {
            this._allHandler[tag] = [handler];
        } else {
            arr.push(handler);
        }
    },

    RemoveEvent: function (tag, handler) {
        let arr = this._allHandler[tag];
        cc.assert(arr != undefined, "arr is null");
        cc.js.array.remove(arr, handler);
    },
    
    ExecuteEvent: function (tag, data) {
        let arr = this._allHandler[tag];
        cc.assert(arr != undefined, "arr is null");

        let size = arr.length;
        for (let i = 0; i < size; ++ i) {
            arr[i](data);
        }
    }
});

SunX.SEventManager.Singleton = null;
SunX.SEventManager.InitSingleton = function () {
    SunX.SEventManager.Singleton = new SunX.SEventManager();
};

SunX.SResItem = cc._Class.extend({
    _resPath: null,
    _type: null,

    ctor: function (resPath, type) {
        this._resPath = resPath;
        this._type = type;
    },

    GetResPath: function () {
        return this._resPath;
    },

    GetType: function () {
        return this._type;
    }
});

SunX.SResManager = cc._Class.extend({
    _resItems: null,
    _spriteFrameCache: null,

    _loadOverFunc: null,
    _total: 0,
    _count: 0,
    _isWorking: false,

    ctor: function () {
        this._resItems = {};
        this._spriteFrameCache = {};
    },

    Load: function (resources, func) {
        cc.assert(!this._isWorking, "Resource is working!");
        if (this._isWorking) return;

        if (!(resources instanceof Array)) {
            resources = resources ? [resources] : [];
        }

        this._isWorking = true;
        this._loadOverFunc = func;
        this._total += resources.length;
        this._count = 0;

        let item = null;
        for (let i = 0; i < resources.length; ++i) {
            item = resources[i];
            if (this._resItems[item.GetResPath()] != undefined) continue;
            this._resItems[item.GetResPath()] = item;
            cc.loader.loadRes(item.GetResPath(), item.GetType(), this._loadOverItem.bind(this));
        }
    },

    ReleaseRes: function (resources) {
        if (!(resources instanceof Array)) {
            resources = resources ? [resources] : [];
        }

        let item = null;
        let path = null;
        for (let i = 0; i < resources.length; ++ i) {
            path = resources[i];
            item = this._resItems[path];
            if (item == undefined) continue;
            delete this._resItems[path];

            this.releaseResType(item.GetResPath(), item.GetType());
        }
    },

    ReleaseResType: function (res, type) {
        if (type == cc.SpriteAtlas) {
            let uuid = cc.loader._getResUuid(res, type);
            let atlas = cc.loader.getRes(uuid);

            if (atlas) this._releaseSpriteAtlas(atlas);
        } else if (type == cc.SpriteFrame) {
            let uuid = cc.loader._getResUuid(res, type);
            let spriteFrame = cc.loader.getRes(uuid);

            if (spriteFrame) {
                this._releaseSpriteFrame(spriteFrame);
            }
        }
    },

    GetPrefab: function (path) {
        var item = this._resItems[path];
        cc.assert(item != undefined, "_resItems no item");
        var uuid = cc.loader._getResUuid(item.GetResPath(), item.GetType());
        return cc.loader.getRes(uuid);
    },

    GetSpriteFrame: function (name) {
        return this._spriteFrameCache[name];
    },

    _loadOverItem: function (error, asset) {
        if (asset instanceof cc.SpriteAtlas) {
            this._loadSpriteAtlas(asset);
        } else if (asset instanceof cc.SpriteFrame) {
            this._spriteFrameCache[asset.name] = asset;
        }

        this._count += 1;
        if (this._count >= this._total) {
            this._loadOverFunc();
            this._isWorking = false;
        }
    },

    _loadSpriteAtlas: function (atlas) {
        let spriteFrames = atlas._spriteFrames;
        for (let key in spriteFrames) {
            this._spriteFrameCache[key] = spriteFrames[key];
        }
    },

    _releaseSpriteAtlas: function (atlas) {
        let spriteFrames = atlas._spriteFrames;
        let spriteFrame = null;
        for (let key in spriteFrames) {
            spriteFrame = this._spriteFrameCache[key];
            if (spriteFrame != undefined) {
                cc.loader.releaseAsset(spriteFrame);
            }
            delete this._spriteFrameCache[key];
        }

        let texture2D = atlas.getTexture();
        cc.loader.release(texture2D.url);
        cc.loader.releaseAsset(texture2D);
        cc.loader.releaseAsset(atlas);
    },

    _releaseSpriteFrame: function (spriteFrame) {
        delete this._spriteFrameCache[spriteFrame.name];

        let texture2D = spriteFrame.getTexture();
        cc.loader.release(texture2D.url);
        cc.loader.releaseAsset(texture2D);
        cc.loader.releaseAsset(spriteFrame);
    }
});

SunX.SResManager.Singleton = null;
SunX.SResManager.InitSingleton = function () {
    SunX.SResManager.Singleton = new SunX.SResManager();
};

module.exports = SunX;