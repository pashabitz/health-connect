"use strict";
/// <reference types="node" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_url_1 = require("node:url");
var vite_1 = require("vite");
var activities_mjs_1 = require("./server/activities.mjs");
var auth_mjs_1 = require("./server/auth.mjs");
var appRoot = (0, node_url_1.fileURLToPath)(new URL('.', import.meta.url));
exports.default = (0, vite_1.defineConfig)(function (_a) {
    var mode = _a.mode;
    var env = (0, vite_1.loadEnv)(mode, appRoot, '');
    return {
        root: appRoot,
        plugins: [{
                name: 'local-activities-api',
                configureServer: function (server) {
                    var _this = this;
                    server.middlewares.use(function (request, response, next) {
                        var _a;
                        var pathname = new URL((_a = request.url) !== null && _a !== void 0 ? _a : '/', 'http://localhost').pathname;
                        if (pathname.toLowerCase().endsWith('.csv') || /\/export_[^/]+(?:\/|$)/i.test(pathname)) {
                            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
                            response.end('Not found');
                            return;
                        }
                        next();
                    });
                    server.middlewares.use('/api/activities', function (request, response) { return __awaiter(_this, void 0, void 0, function () {
                        var userId, dashboard, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (request.method !== 'GET') {
                                        response.writeHead(405, { Allow: 'GET', 'Content-Type': 'application/json' });
                                        response.end(JSON.stringify({ error: 'Method not allowed' }));
                                        return [2 /*return*/];
                                    }
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 4, , 5]);
                                    return [4 /*yield*/, (0, auth_mjs_1.authenticateRequest)(request, env.CLERK_SECRET_KEY)];
                                case 2:
                                    userId = _a.sent();
                                    if (!userId) {
                                        response.writeHead(401, {
                                            'Content-Type': 'application/json; charset=utf-8',
                                            'Cache-Control': 'no-store',
                                            'X-Content-Type-Options': 'nosniff',
                                        });
                                        response.end(JSON.stringify({ error: 'Unauthorized' }));
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, (0, activities_mjs_1.loadDashboardData)()];
                                case 3:
                                    dashboard = _a.sent();
                                    response.writeHead(200, {
                                        'Content-Type': 'application/json; charset=utf-8',
                                        'Cache-Control': 'no-store',
                                        'X-Content-Type-Options': 'nosniff',
                                    });
                                    response.end(JSON.stringify(dashboard));
                                    return [3 /*break*/, 5];
                                case 4:
                                    error_1 = _a.sent();
                                    console.error('Could not load the local activity CSV:', error_1);
                                    response.writeHead(500, {
                                        'Content-Type': 'application/json; charset=utf-8',
                                        'Cache-Control': 'no-store',
                                        'X-Content-Type-Options': 'nosniff',
                                    });
                                    response.end(JSON.stringify({ error: 'Could not read activities. Check that the export CSV is present and valid.' }));
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); });
                },
            }],
        server: {
            host: '127.0.0.1',
            strictPort: true,
            fs: { strict: true, allow: [appRoot] },
        },
    };
});
