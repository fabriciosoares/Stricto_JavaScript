// (6) Substituição do arquivo de controle do indexedDB para pleno funcionamento

'use strict';
angular.module('xc.indexedDB', []).provider('$indexedDB', function() {
	var module = this,
		READONLY = "readonly",
		READWRITE = "readwrite",
		VERSIONCHANGE = "versionchange",
		NEXT = "next",
		NEXTUNIQUE = "nextunique",
		PREV = "prev",
		PREVUNIQUE = "prevunique";
	module.dbName = '';
	module.dbVersion = 1;
	module.db = null;
	module.dbPromise = null;
	module.debugMode = false;
	module.onTransactionComplete = function(e) {
		if(module.debugMode) console.log('Transaction completed.');
	};
	module.onTransactionAbort = function(e) {
		if(module.debugMode) console.log('Transaction aborted: '+ (e.target.webkitErrorMessage || e.target.error.message || e.target.errorCode));
	};
	module.onTransactionError = function(e) {
		if(module.debugMode) console.log('Transaction failed: ' + e.target.errorCode);
	};
	module.onDatabaseError = function(e) {
		if(module.debugMode) alert("Database error: " + (e.target.webkitErrorMessage || e.target.errorCode));
	};
	module.onDatabaseBlocked = function(e) {
		if(module.debugMode) alert("Database is blocked. Try close other tabs with this page open and reload this page!");
	};
	module.connection = function(databaseName) {
		module.dbName = databaseName;
		return this;
	};
	module.upgradeDatabase = function(newVersion, callback) {
		module.dbVersion = newVersion;
		module.upgradeCallback = callback;
		return this;
	};
	module.$get = ['$q', '$rootScope', '$window', function($q, $rootScope, $window) {
		if(!('indexedDB' in $window)) {
			$window.indexedDB = $window.mozIndexedDB || $window.webkitIndexedDB || $window.msIndexedDB;
		}
		var IDBKeyRange = $window.IDBKeyRange || $window.mozIDBKeyRange || $window.webkitIDBKeyRange || $window.msIDBKeyRange;
		var defaultQueryOptions = {
			useIndex: undefined,
			keyRange: null,
			direction: NEXT
		};
		var dbPromise = function() {
			var dbReq, deferred;
			if (!module.dbPromise) {
				deferred = $q.defer();
				module.dbPromise = deferred.promise;
				dbReq = $window.indexedDB.open(module.dbName, module.dbVersion || 1);
				dbReq.onsuccess = function(e) {
					module.db = dbReq.result;
					$rootScope.$apply(function(){
						deferred.resolve(module.db);
					});
				};
				dbReq.onblocked = module.onDatabaseBlocked;
				dbReq.onerror = module.onDatabaseError;
				dbReq.onupgradeneeded = function(e) {
					var db = e.target.result, tx = e.target.transaction;
					if(module.debugMode) console.log('upgrading database "' + db.name + '" from version ' + e.oldVersion+
						' to version ' + e.newVersion + '...');
					module.upgradeCallback && module.upgradeCallback(e, db, tx);
				};
			}
			return module.dbPromise;
		};
		var ObjectStore = function(storeName) {
			this.storeName = storeName;
			this.transaction = undefined;
		};
		ObjectStore.prototype = {
			internalObjectStore: function(storeName, mode) {
				var me = this;
				return dbPromise().then(function(db){
					me.transaction = db.transaction([storeName], mode || READONLY);
					me.transaction.oncomplete = module.onTransactionComplete;
					me.transaction.onabort = module.onTransactionAbort;
					me.onerror = module.onTransactionError;
					return me.transaction.objectStore(storeName);
				});
			},
			"abort": function() {
				if (this.transaction) {
					this.transaction.abort();
				}
			},
			"insert": function(data){
				var d = $q.defer();
				return this.internalObjectStore(this.storeName, READWRITE).then(function(store){
					var req;
					if (angular.isArray(data)) {
						data.forEach(function(item, i){
							req = store.add(item);
							req.onnotify = function(e) {
							   $rootScope.$apply(function(){
									d.notify(e.target.result);
								}); 
							}
							req.onerror = function(e) {
								$rootScope.$apply(function(){
									d.reject(e.target.result);
								});
							};
							req.onsuccess = function(e) {
								if(i == data.length - 1) {
									$rootScope.$apply(function(){
										d.resolve(e.target.result);
									});
								}
							};
						});
					} else {
						req = store.add(data);
						req.onsuccess = req.onerror = function(e) {
							$rootScope.$apply(function(){
								d.resolve(e.target.result);
							});
						};
					}
					return d.promise;
				});
			},
			"upsert": function(data){
				var d = $q.defer();
				return this.internalObjectStore(this.storeName, READWRITE).then(function(store){
					var req;
					if (angular.isArray(data)) {
						data.forEach(function(item, i){
							req = store.put(item);
							req.onnotify = function(e) {
							   $rootScope.$apply(function(){
									d.notify(e.target.result);
								}); 
							}
							req.onerror = function(e) {
								$rootScope.$apply(function(){
									d.reject(e.target.result);
								});
							};
							req.onsuccess = function(e) {
								if(i == data.length - 1) {
									$rootScope.$apply(function(){
										d.resolve(e.target.result);
									});
								}
							};
						});
					} else {
						req = store.put(data);
						req.onsuccess = req.onerror = function(e) {
							$rootScope.$apply(function(){
								d.resolve(e.target.result);
							});
						};
					}
					return d.promise;
				});
			},
			"delete": function(key) {
				var d = $q.defer();
				return this.internalObjectStore(this.storeName, READWRITE).then(function(store){
					var req = store.delete(key);
					req.onsuccess = req.onerror = function(e) {
						$rootScope.$apply(function(){
							d.resolve(e.target.result);
						});
					};
					return d.promise;
				});
			},
			"clear": function() {
				var d = $q.defer();
				return this.internalObjectStore(this.storeName, READWRITE).then(function(store){
					var req = store.clear();
					req.onsuccess = req.onerror = function(e) {
						$rootScope.$apply(function(){
							d.resolve(e.target.result);
						});
					};
					return d.promise;
				});
			},
			"count": function() {
				return this.internalObjectStore(this.storeName, READONLY).then(function(store){
					return store.count();
				});
			},
			"find": function(keyOrIndex, keyIfIndex){
				var d = $q.defer();
				var promise = d.promise;
				return this.internalObjectStore(this.storeName, READONLY).then(function(store){
					var req;
					if(keyIfIndex) {
						req = store.index(keyOrIndex).get(keyIfIndex);
					} else {
						req = store.get(keyOrIndex);
					}
					req.onsuccess = req.onerror = function(e) {
						$rootScope.$apply(function(){
							d.resolve(e.target.result);
						});
					};
					return promise;
				});
			},
			"getAll": function() {
				var results = [], d = $q.defer();
				return this.internalObjectStore(this.storeName, READONLY).then(function(store){
					var req;
					if (store.getAll) {
						req = store.getAll();
						req.onsuccess = req.onerror = function(e) {
							$rootScope.$apply(function(){
								d.resolve(e.target.result);
							});
						};
					} else {
						req = store.openCursor();
						req.onsuccess = function(e) {
							var cursor = e.target.result;
							if(cursor){
								results.push(cursor.value);
								cursor.continue();
							} else {
								$rootScope.$apply(function(){
									d.resolve(results);
								});
							}
						};
						req.onerror = function(e) {
							d.reject(e.target.result);
						};
					}
					return d.promise;
				});
			},
			"each": function(callback, options){
				var d = $q.defer();
				return this.internalObjectStore(this.storeName, READWRITE).then(function(store){
				   var req;
				   options = options || defaultQueryOptions;
				   if(options.useIndex) {
						req = store.index(options.useIndex).openCursor(options.keyRange, options.direction);
					} else {
						req = store.openCursor(options.keyRange, options.direction);
					}
					req.onsuccess = req.onerror = function(e) {
						$rootScope.$apply(function(){
							if(!e.target.result){
								d.resolve(e.target.result);
							}
							callback(e.target.result);
						});
					};
					return d.promise;
				});
			}
		};
		var QueryBuilder = function() {
			this.result = defaultQueryOptions;
		};
		QueryBuilder.prototype = {
			"$lt": function(value) {
				this.result.keyRange = IDBKeyRange.upperBound(value, true);
				return this;
			},
			"$gt": function(value) {
				this.result.keyRange = IDBKeyRange.lowerBound(value, true);
				return this;
			},
			"$lte": function(value) {
				this.result.keyRange = IDBKeyRange.upperBound(value);
				return this;
			},
			"$gte": function(value) {
				this.result.keyRange = IDBKeyRange.lowerBound(value);
				return this;
			},
			"$eq": function(value) {
				this.result.keyRange = IDBKeyRange.only(value);
				return this;
			},
			"$between": function(lowValue, hiValue, exLow, exHi) {
				this.result.keyRange = IDBKeyRange.bound(lowValue,hiValue,exLow||false,exHi||false);
				return this;
			},
			"$asc": function(unique) {
				this.result.order = (unique)? NEXTUNIQUE: NEXT;
				return this;
			},
			"$desc": function(unique) {
				this.result.order = (unique)? PREVUNIQUE: PREV;
				return this;
			},
			"$index": function(indexName) {
				this.result.useIndex = indexName;
				return this;
			},
			"compile": function() {
				return this.result;
			}
		};
		return {
			"objectStore": function(storeName) {
				return new ObjectStore(storeName);
			},
			"dbInfo": function() {
				var storeNames, stores = [], tx, store;
				return dbPromise().then(function(db){
					storeNames = Array.prototype.slice.apply(db.objectStoreNames);
					tx = db.transaction(storeNames, READONLY);
					storeNames.forEach(function(storeName){
						store = tx.objectStore(storeName);
						stores.push({
						   name: storeName,
						   keyPath: store.keyPath,
						   autoIncrement: store.autoIncrement,
						   count: store.count(),
						   indices: Array.prototype.slice.apply(store.indexNames)
						});
					});
					return {
						name: db.name,
						version: db.version,
						objectStores: stores
					};
				});
			},
			"closeDB": function() {
				dbPromise().then(function(db){
					db.close();
				});
				module.db = null;
				module.dbPromise = null;
				return this;
			},
			"switchDB": function(databaseName, version, upgradeCallback) {
				this.closeDB();
				module.dbName = databaseName;
				module.dbVersion = version || 1;
				module.upgradeCallback = upgradeCallback || function() {};
				return this;
			},
			"queryBuilder": function() {
				return new QueryBuilder();
			}
		};
	}];
});