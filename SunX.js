var SunX = {};

SunX.SLinkListItem = function (Data) {
    this.pre = null;
    this.next = null;
    this.data = Data;
};

SunX.LinkList = cc._Class.extend({

    ctor: function () {
        this._size = 0;
        this._head = null;
        this._end = null;
    },

    Size: function () {
        return this._size;
    },

    PushBack: function (data) {
        if (0 == this._size) {
            this._head = data;
            this._end = data;
        } else {
            this._end.next = data;
            data.pre = this._end;
            this._end = data;
        }
        ++ this._size;
    },

    PushFront: function (data) {
        if (0 == this._size) {
            this._head = data;
            this._end = data;
        } else {
            this._head.pre = data;
            data.next = this._head;
            this._head = data;
        }
        ++ this._size;
    },

    Remove: function (data) {
        if (0 == this._size) return;
        data.pre.next = data.next;
        -- this._size;
    },

    Clear: function () {

    },

    GetList: function () {
        return this._head;
    }
});

SunX.SEventEntry = cc._Class.extend({

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

SunX.SEventManager = cc._Class.extend({
    _hashForEntry: null,
    _hashListener: null,
    _removeArray: null,
    _isRemoveDirty: false,

    ctor: function () {
        this._hashForEntry = {};
        this._hashListener = {};
        this._removeArray = [];
        this._isRemoveDirty = false;

        cc.director.getScheduler().schedule(this._update, this, 0, false);
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

        let entry = new SunX.SEventEntry();
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

SunX.sEventManager = null;
SunX.SEventManager.InitSingleton = function () {
    SunX.sEventManager = new SunX.SEventManager();
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

SunX.sResManager = null;
SunX.SResManager.InitSingleton = function () {
    SunX.sResManager = new SunX.SResManager();
};

module.exports = SunX;