const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","fonts/fonts.css"]),
	mimeTypes: {".png":"image/png",".css":"text/css"},
	_: {
		client: {start:"_app/immutable/entry/start.DG-Eulnw.js",app:"_app/immutable/entry/app.BcSn67ug.js",imports:["_app/immutable/entry/start.DG-Eulnw.js","_app/immutable/chunks/D6j3GxOv.js","_app/immutable/chunks/CkTvmw98.js","_app/immutable/chunks/B2bvum43.js","_app/immutable/chunks/DnHmEvXm.js","_app/immutable/entry/app.BcSn67ug.js","_app/immutable/chunks/CkTvmw98.js","_app/immutable/chunks/l61C7KQG.js","_app/immutable/chunks/B9q02PmC.js","_app/immutable/chunks/lPEFebrr.js","_app/immutable/chunks/DBx-IR2N.js","_app/immutable/chunks/BoBM9_cA.js","_app/immutable/chunks/B2bvum43.js","_app/immutable/chunks/DnHmEvXm.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-B4K8N_2j.js')),
			__memo(() => import('./chunks/1-B7NXYxSo.js')),
			__memo(() => import('./chunks/2-YT36Ignf.js')),
			__memo(() => import('./chunks/3-D7qapJGY.js')),
			__memo(() => import('./chunks/4-Mkxi4rIB.js')),
			__memo(() => import('./chunks/5-RShlWHoR.js')),
			__memo(() => import('./chunks/6-B6CQA_TT.js')),
			__memo(() => import('./chunks/7-CphJcYfp.js')),
			__memo(() => import('./chunks/8-B-AfPIyO.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/image-crop",
				pattern: /^\/image-crop\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/image-editor",
				pattern: /^\/image-editor\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/image-resize",
				pattern: /^\/image-resize\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/image-rotate",
				pattern: /^\/image-rotate\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/image-scan",
				pattern: /^\/image-scan\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/image-to-pdf",
				pattern: /^\/image-to-pdf\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
