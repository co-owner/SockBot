'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
chai.use(require('sinon-chai'));

const Forum = require('../../../providers/nodebb'),
    postModule = require('../../../providers/nodebb/post'),
    topicModule = require('../../../providers/nodebb/topic'),
    categoryModule = require('../../../providers/nodebb/category'),
    userModule = require('../../../providers/nodebb/user'),
    chatModule = require('../../../providers/nodebb/chat'),
    notifyModule = require('../../../providers/nodebb/notification');
const utils = require('../../../lib/utils');

const request = require('request');

describe('providers/nodebb', () => {
    it('should export a function()', () => {
        Forum.should.be.a('function');
    });
    describe('compatibilities', () => {
        it('should be a string', () => {
            Forum.compatibilities.should.be.a('string');
        });
    });
    describe('ctor', () => {
        let sandbox = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            sandbox.stub(postModule, 'bindPost');
            sandbox.stub(topicModule, 'bindTopic');
            sandbox.stub(categoryModule, 'bindCategory');
            sandbox.stub(userModule, 'bindUser');
            sandbox.stub(chatModule, 'bindChat');
            sandbox.stub(notifyModule, 'bindNotification');
        });
        afterEach(() => sandbox.restore());
        it('should store configuration data in utils.storage', () => {
            const expected = Math.random();
            const forum = new Forum(expected);
            utils.mapGet(forum).config.should.equal(expected);
        });
        it('should store useragent in utils.storage', () => {
            const expected = Math.random();
            const forum = new Forum({}, expected);
            utils.mapGet(forum).useragent.should.equal(expected);
        });
        it('should set plugin store to empty array', () => {
            const forum = new Forum({});
            forum._plugins.should.eql([]);
        });
        it('should use Post.bindPost to generate Post object', () => {
            const forum = new Forum();
            postModule.bindPost.should.have.been.calledWith(forum);
        });
        it('should store Post object in this.Post', () => {
            const expected = Math.random();
            postModule.bindPost.returns(expected);
            new Forum().Post.should.equal(expected);
        });
        it('should use Topic.bindTopic to generate Topic object', () => {
            const forum = new Forum();
            topicModule.bindTopic.should.have.been.calledWith(forum);
        });
        it('should store Topic object in this.Topic', () => {
            const expected = Math.random();
            topicModule.bindTopic.returns(expected);
            new Forum().Topic.should.equal(expected);
        });
        it('should use Category.bindCategory to generate Category object', () => {
            const forum = new Forum();
            categoryModule.bindCategory.should.have.been.calledWith(forum);
        });
        it('should store Category object in this.Category', () => {
            const expected = Math.random();
            categoryModule.bindCategory.returns(expected);
            new Forum().Category.should.equal(expected);
        });
        it('should use User.bindUser to generate User object', () => {
            const forum = new Forum();
            userModule.bindUser.should.have.been.calledWith(forum);
        });
        it('should store User object in this.User', () => {
            const expected = Math.random();
            userModule.bindUser.returns(expected);
            new Forum().User.should.equal(expected);
        });
        it('should use Notification.bindNotification to generate Notification object', () => {
            const forum = new Forum({});
            notifyModule.bindNotification.should.have.been.calledWith(forum);
        });
        it('should store Notification object in this.Notification', () => {
            const expected = Math.random();
            notifyModule.bindNotification.returns(expected);
            new Forum().Notification.should.equal(expected);
        });
        it('should use Chat.bindChat to generate Chat object', () => {
            const forum = new Forum({});
            chatModule.bindChat.should.have.been.calledWith(forum);
        });
        it('should store Notification object in this.Notification', () => {
            const expected = Math.random();
            chatModule.bindChat.returns(expected);
            new Forum().Chat.should.equal(expected);
        });
    });
    describe('getters', () => {
        describe('get config', () => {
            let forum = null,
                data = null;
            beforeEach(() => {
                forum = new Forum({
                    core: {}
                });
                data = utils.mapGet(forum);
            });
            it('should retrieve stored config', () => {
                const expected = {};
                expected[`a${Math.random()}b`] = `c${Math.random()}d`;
                data.config = expected;
                forum.config.should.eql(expected);
            });
            it('should retrieve clone of stored config', () => {
                const expected = {};
                expected[`a${Math.random()}b`] = `c${Math.random()}d`;
                data.config = expected;
                forum.config.should.not.equal(expected);
            });
        });
        describe('get useragent', () => {
            let forum = null,
                data = null;
            beforeEach(() => {
                forum = new Forum({
                    core: {}
                }, '');
                data = utils.mapGet(forum);
            });
            it('should retrieve stored useragent', () => {
                const expected = `c${Math.random()}d`;
                data.useragent = expected;
                forum.useragent.should.eql(expected);
            });
        });
        describe('get url', () => {
            let forum = null,
                data = null;
            beforeEach(() => {
                forum = new Forum({
                    core: {}
                });
                data = utils.mapGet(forum);
            });
            it('should return url from config', () => {
                const expected = `c${Math.random()}d`;
                data.config.core.forum = expected;
                forum.url.should.eql(expected);
            });
        });
        describe('get username', () => {
            let forum = null,
                data = null;
            beforeEach(() => {
                forum = new Forum({
                    core: {}
                });
                data = utils.mapGet(forum);
            });
            it('should return username from config', () => {
                const expected = `c${Math.random()}d`;
                data.config.core.username = expected;
                forum.username.should.eql(expected);
            });
        });
        describe('get important users', () => {
            let forum = null,
                data = null;
            beforeEach(() => {
                forum = new Forum({
                    core: {}
                });
                data = utils.mapGet(forum);
            });
            it('should store logged in user data', () => {
                const expected = Math.random();
                data.user = expected;
                forum.user.should.equal(expected);
            });
            it('should store bot owner data', () => {
                const expected = Math.random();
                data.owner = expected;
                forum.owner.should.equal(expected);
            });
        });
        describe('get/set Commands', () => {
            let forum = null,
                data = null;
            beforeEach(() => {
                forum = new Forum({
                    core: {}
                });
                data = utils.mapGet(forum);
            });
            it('should set Commands', () => {
                const expected = Math.random();
                forum.Commands = expected;
                data.commands.should.equal(expected);
            });
            it('should get Commands', () => {
                const expected = Math.random();
                data.commands = expected;
                forum.Commands.should.equal(expected);
            });
        });
    });
    describe('_validateCookies()', () => {
        let forum = null,
            sandbox = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            sandbox = sinon.sandbox.create();
            sandbox.stub(request, 'jar');
        });
        afterEach(() => sandbox.restore());
        it('should create cookiejar when not set', () => {
            forum._verifyCookies();
            request.jar.should.have.been.calledOnce;
        });
        it('should store cookiejar when not set', () => {
            const expected = Math.random();
            request.jar.returns(expected);
            forum._verifyCookies();
            forum._cookiejar.should.equal(expected);
        });
        it('should not create cookiejar when set', () => {
            forum._cookiejar = true;
            forum._verifyCookies();
            request.jar.should.not.have.been.called;
        });
        it('should use existing cookiejar when set', () => {
            const expected = Math.random();
            forum._cookiejar = expected;
            forum._verifyCookies();
            forum._cookiejar.should.equal(expected);
        });
    });
    describe('_getConfig()', () => {
        let forum = null,
            data = null,
            sandbox = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            data = utils.mapGet(forum);
            sandbox = sinon.sandbox.create();
            sandbox.stub(forum, '_verifyCookies');
            sandbox.stub(request, 'get').yields(null, null, '""');
        });
        afterEach(() => sandbox.restore());
        it('should verify cookiejar', () => {
            return forum._getConfig().then(() => {
                forum._verifyCookies.should.have.been.calledOnce;
            });
        });
        it('should request config url', () => {
            const base = `a${Math.random()}b`;
            const url = `${base}/api/config`;
            data.config.core.forum = base;
            return forum._getConfig().then(() => {
                request.get.firstCall.args[0].url.should.equal(url);
            });
        });
        it('should request config with cookiejar', () => {
            const jar = `a${Math.random()}b`;
            forum._cookiejar = jar;
            return forum._getConfig().then(() => {
                request.get.firstCall.args[0].jar.should.equal(jar);
            });
        });
        it('should request config with useragent', () => {
            const agent = `a${Math.random()}b`;
            data.useragent = agent;
            return forum._getConfig().then(() => {
                request.get.firstCall.args[0].headers.should.eql({
                    'User-Agent': agent
                });
            });
        });
        it('should request config as expected', () => {
            const base = `a${Math.random()}b`;
            const url = `${base}/api/config`;
            const cookiejar = Math.random();
            data.config.core.forum = base;
            data.useragent = 'a';
            forum._cookiejar = cookiejar;
            return forum._getConfig().then(() => {
                request.get.calledWith({
                    url: url,
                    jar: cookiejar,
                    headers: {
                        'User-Agent': 'a'
                    }
                }).should.be.true;
            });
        });
        it('should store parsed config', () => {
            const expected = {
                foo: Math.random()
            };
            request.get.yields(null, null, JSON.stringify(expected));
            return forum._getConfig().then(() => {
                forum._config.should.eql(expected);
            });
        });
        it('should resolve to parsed config', () => {
            const expected = {
                foo: Math.random()
            };
            request.get.yields(null, null, JSON.stringify(expected));
            return forum._getConfig().should.become(expected);
        });
        it('should reject on bad request response', () => {
            request.get.yields(new Error('bad'));
            return forum._getConfig().should.be.rejectedWith('bad');
        });
        it('should reject with Error on bad request response (string version)', () => {
            request.get.yields('bad');
            return forum._getConfig().should.be.rejectedWith(Error);
        });
        it('should reject with Error on bad request response (Error version)', () => {
            request.get.yields(new Error('bad'));
            return forum._getConfig().should.be.rejectedWith(Error);
        });
        it('should reject on bad JSON response', () => {
            request.get.yields(null, null, '{"foo":"bar');
            return forum._getConfig().should.be.rejectedWith('Unexpected end of');
        });
    });
    describe('login()', () => {
        let forum = null,
            data = null,
            sandbox = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            data = utils.mapGet(forum);
            sandbox = sinon.sandbox.create();
            sandbox.stub(forum, '_verifyCookies');
            sandbox.stub(forum, '_getConfig').resolves({});
            sandbox.stub(request, 'post').yields(null, {
                statusCode: 200
            }, '""');
        });
        afterEach(() => sandbox.restore());
        it('should retrieve config via _getConfig', () => {
            return forum.login().then(() => {
                forum._getConfig.should.have.been.calledOnce;
            });
        });
        it('should verify cookiejar via _verifyCookies', () => {
            return forum.login().then(() => {
                forum._verifyCookies.should.have.been.calledOnce;
            });
        });
        it('should use request.post to login', () => {
            return forum.login().then(() => {
                request.post.should.have.been.calledOnce;
            });
        });
        it('should post to expected URL', () => {
            const url = `a${Math.random()}b`,
                expected = `${url}/login`;
            data.config.core.forum = url;
            return forum.login().then(() => {
                const posted = request.post.firstCall.args[0];
                posted.url.should.equal(expected);
            });
        });
        it('should use stored cookiejar', () => {
            const expected = `a${Math.random()}b`;
            forum._cookiejar = expected;
            return forum.login().then(() => {
                const posted = request.post.firstCall.args[0];
                posted.jar.should.equal(expected);
            });
        });
        it('should use csrf token header', () => {
            const expected = `a${Math.random()}b`;
            forum._getConfig.resolves({
                'csrf_token': expected
            });
            return forum.login().then(() => {
                const posted = request.post.firstCall.args[0];
                posted.headers['x-csrf-token'].should.equal(expected);
            });
        });
        it('should use useragent header', () => {
            const expected = `a${Math.random()}b`;
            data.useragent = expected;
            return forum.login().then(() => {
                const posted = request.post.firstCall.args[0];
                posted.headers['User-Agent'].should.equal(expected);
            });
        });
        it('should use expected headers', () => {
            const expected = `a${Math.random()}b`;
            const agent = `c${Math.random()}d`;
            data.useragent = agent;
            forum._getConfig.resolves({
                'csrf_token': expected
            });
            return forum.login().then(() => {
                const posted = request.post.firstCall.args[0];
                posted.headers.should.eql({
                    'User-Agent': agent,
                    'x-csrf-token': expected
                });
            });
        });
        it('should use expected form', () => {
            const url = `a${Math.random()}b`,
                username = `c${Math.random()}d`,
                password = `e${Math.random()}f`;
            data.config.core.forum = url;
            data.config.core.username = username;
            data.config.core.password = password;
            return forum.login().then(() => {
                const posted = request.post.firstCall.args[0];
                posted.form.should.eql({
                    username: username,
                    password: password,
                    remember: 'off',
                    returnTo: url
                });
            });
        });
        it('should resolve to self', () => {
            return forum.login().should.become(forum);
        });
        it('should reject when _getConfig rejects', () => {
            forum._getConfig.rejects(new Error('bad'));
            return forum.login().should.be.rejectedWith('bad');
        });
        it('should reject with an Error when _getConfig rejects with string', () => {
            forum._getConfig.rejects('bad');
            return forum.login().should.be.rejectedWith(Error);
        });
        it('should reject with an Error when _getConfig rejects with Error', () => {
            forum._getConfig.rejects(new Error('bad'));
            return forum.login().should.be.rejectedWith(Error);
        });
        it('should reject when request.post fails', () => {
            request.post.yields('bad');
            return forum.login().should.be.rejectedWith('bad');
        });
        it('should reject with an Error when request.post rejects with string', () => {
            request.post.yields('bad');
            return forum.login().should.be.rejectedWith(Error);
        });
        it('should reject with an Error when request.post rejects with Error', () => {
            request.post.yields(new Error('bad'));
            return forum.login().should.be.rejectedWith(Error);
        });
        it('should reject when request.post yields 4xx status code', () => {
            request.post.yields(null, {
                statusCode: 403
            }, 'bad');
            return forum.login().should.be.rejectedWith('bad');
        });
        it('should reject with Error when request.post yields 4xx status code', () => {
            request.post.yields(null, {
                statusCode: 403
            }, 'bad');
            return forum.login().should.be.rejectedWith(Error);
        });
        it('should reject with Error when request.post yields 4xx status code (2)', () => {
            request.post.yields(null, {
                statusCode: 403
            }, new Error('bad'));
            return forum.login().should.be.rejectedWith(Error);
        });
    });
    describe('connectWebsocket()', () => {
        let forum = null,
            data = null,
            sandbox = null,
            socket = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            data = utils.mapGet(forum);
            sandbox = sinon.sandbox.create();
            sandbox.stub(forum, '_verifyCookies');
            sandbox.stub(forum, 'emit');
            forum._cookiejar = {
                getCookieString: sinon.stub()
            };
            socket = {
                on: sinon.stub(),
                once: sinon.spy((evt, callback) => evt === 'connect' && callback())
            };
            sandbox.stub(Forum, 'io').returns(socket);
        });
        afterEach(() => sandbox.restore());
        describe('initial call', () => {
            it('should verify cookies', () => {
                return forum.connectWebsocket().then(() => {
                    forum._verifyCookies.should.have.been.calledOnce;
                });
            });
            it('should steal the cookies from the cookie jar', () => {
                const url = `a${Math.random()}b`;
                data.config.core.forum = url;
                return forum.connectWebsocket().then(() => {
                    forum._cookiejar.getCookieString.should.have.been.calledWith(url);
                });
            });
            it('should construct websocket for forum', () => {
                const url = `a${Math.random()}b`;
                data.config.core.forum = url;
                return forum.connectWebsocket().then(() => {
                    Forum.io.should.have.been.calledWith(url);
                });
            });
            it('should pass cookies to websocket for forum', () => {
                const cookies = `cookies${Math.random()}`;
                forum._cookiejar.getCookieString.returns(cookies);
                return forum.connectWebsocket().then(() => {
                    Forum.io.firstCall.args[1].extraHeaders.Cookie.should.equal(cookies);
                });
            });
            it('should pass useragent to websocket for forum', () => {
                const agent = `a${Math.random()}b`;
                data.useragent = agent;
                return forum.connectWebsocket().then(() => {
                    Forum.io.firstCall.args[1].extraHeaders['User-Agent'].should.equal(agent);
                });
            });
            it('should pass headers to websocket for forum', () => {
                const url = `a${Math.random()}b`;
                const agent = `c${Math.random()}d`;
                const cookies = `cookies${Math.random()}`;
                forum._cookiejar.getCookieString.returns(cookies);
                data.config.core.forum = url;
                data.useragent = agent;
                return forum.connectWebsocket().then(() => {
                    Forum.io.firstCall.args.should.deep.eql([
                        url, {
                            extraHeaders: {
                                'Origin': url,
                                'User-Agent': agent,
                                'Cookie': cookies
                            }
                        }
                    ]);
                });
            });
            it('should register for websocket `pong` event', () => {
                return forum.connectWebsocket().then(() => {
                    socket.on.should.have.been.calledWith('pong');
                });
            });
            it('should emit `log` on websocket pong event', () => {
                socket.on = (evt, callback) => evt === 'pong' && callback(4242);
                return forum.connectWebsocket().then(() => {
                    forum.emit.should.have.been.calledWith('log', 'Ping exchanged with 4242ms latency');
                });
            });
            it('should register for websocket `connect` event', () => {
                return forum.connectWebsocket().then(() => {
                    socket.on.should.have.been.calledWith('connect');
                });
            });
            it('should emit `connect` on websocket connect event', () => {
                socket.on = (evt, callback) => evt === 'connect' && callback();
                return forum.connectWebsocket().then(() => {
                    forum.emit.should.have.been.calledWith('connect');
                });
            });
            it('should register for websocket `disconnect` event', () => {
                return forum.connectWebsocket().then(() => {
                    socket.on.should.have.been.calledWith('disconnect');
                });
            });
            it('should emit `connect` on websocket connect event', () => {
                socket.on = (evt, callback) => evt === 'disconnect' && callback();
                return forum.connectWebsocket().then(() => {
                    forum.emit.should.have.been.calledWith('disconnect');
                });
            });
            it('should store socket for later', () => {
                return forum.connectWebsocket().then(() => {
                    forum.socket.should.equal(socket);
                });
            });
            it('should resolve to self', () => {
                return forum.connectWebsocket().should.become(forum);
            });
            it('should reject on websocket connect error', () => {
                socket.once = (evt, callback) => evt === 'error' && callback();
                return forum.connectWebsocket().should.be.rejected;
            });
        });
        describe('subsequent calls', () => {
            beforeEach(() => {
                forum.socket = socket;
            });
            it('should not verify cookies', () => {
                return forum.connectWebsocket().then(() => {
                    forum._verifyCookies.should.not.have.been.called;
                });
            });
            it('should not steal the cookies from the cookie jar', () => {
                return forum.connectWebsocket().then(() => {
                    forum._cookiejar.getCookieString.should.not.have.been.called;
                });
            });
            it('should not construct websocket for forum', () => {
                return forum.connectWebsocket().then(() => {
                    Forum.io.should.not.have.been.called;
                });
            });
            it('should not register for websocket multi events', () => {
                return forum.connectWebsocket().then(() => {
                    socket.on.should.not.have.been.called;
                });
            });
            it('should not register for websocket once events', () => {
                return forum.connectWebsocket().then(() => {
                    socket.once.should.not.have.been.called;
                });
            });
            it('should leafe stored socket undisturbed', () => {
                return forum.connectWebsocket().then(() => {
                    forum.socket.should.equal(socket);
                });
            });
            it('should resolve to self', () => {
                return forum.connectWebsocket().should.become(forum);
            });
        });
    });
    describe('addPlugin()', () => {
        let forum = null,
            plug = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            plug = {
                activate: sinon.stub(),
                deactivate: sinon.stub()
            };
        });
        it('should accept direct generation function', () => {
            return forum.addPlugin(() => plug).should.be.fulfilled;
        });
        it('should accept indirect generation function', () => {
            return forum.addPlugin({
                plugin: () => plug
            }).should.be.fulfilled;
        });
        it('should add plugin to plugin list', () => {
            forum._plugins = [5, 3, 4, 1, 2];
            return forum.addPlugin(() => plug).then(() => {
                forum._plugins.should.eql([5, 3, 4, 1, 2, plug]);
            });
        });
        it('should pass forum to plugin function', () => {
            const spy = sinon.spy(() => plug);
            return forum.addPlugin(spy).then(() => {
                spy.should.have.been.calledWith(forum);
            });
        });
        it('should pass configuration to plugin function', () => {
            const spy = sinon.spy(() => plug);
            const expected = Math.random();
            return forum.addPlugin(spy, expected).then(() => {
                spy.should.have.been.calledWith(forum, expected);
            });
        });
        it('should reject when plugin function does not return an object', () => {
            return forum.addPlugin(() => 7).should.be.rejected;
        });
        it('should reject when plugin is missing activate function', () => {
            delete plug.activate;
            return forum.addPlugin(() => plug).should.be.rejected;
        });
        it('should reject when plugin is missing activate function', () => {
            delete plug.deactivate;
            return forum.addPlugin(() => plug).should.be.rejected;
        });
    });
    describe('activate()', () => {
        let forum = null,
            data = null,
            sandbox = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            forum = new Forum({
                core: {}
            });
            data = utils.mapGet(forum);
            sandbox.stub(forum.User, 'getByName').resolves({});
            sandbox.stub(forum.Notification, 'activate');
            sandbox.stub(forum.Chat, 'activate');
            sandbox.stub(forum, 'connectWebsocket').resolves();
        });
        afterEach(() => sandbox.restore());
        it('should connect to websocket', () => {
            return forum.activate().then(() => {
                forum.connectWebsocket.should.have.been.calledOnce;
            });
        });
        it('should fetch logged in user info', () => {
            const name = `name${Math.random()}`;
            data.config.core.username = name;
            return forum.activate().then(() => {
                forum.User.getByName.should.have.been.calledWith(name);
            });
        });
        it('should fetch logged in user info', () => {
            const name = `owner${Math.random()}`;
            data.config.core.owner = name;
            return forum.activate().then(() => {
                forum.User.getByName.should.have.been.calledWith(name);
            });
        });
        it('should store logged in user information', () => {
            const user = Math.random();
            forum.User.getByName.onFirstCall().resolves(user);
            return forum.activate().then(() => {
                data.user.should.equal(user);
            });
        });
        it('should store owner information', () => {
            const owner = Math.random();
            forum.User.getByName.onSecondCall().resolves(owner);
            return forum.activate().then(() => {
                data.owner.should.equal(owner);
            });
        });
        it('should activate notifications', () => {
            return forum.activate().then(() => {
                forum.Notification.activate.should.have.been.calledOnce;
            });
        });
        it('should activate chats', () => {
            return forum.activate().then(() => {
                forum.Chat.activate.should.have.been.calledOnce;
            });
        });
        it('should activate plugins', () => {
            const spy1 = sinon.stub().resolves(),
                spy2 = sinon.stub().resolves();
            forum._plugins = [{
                activate: spy1
            }, {
                activate: spy2
            }];
            return forum.activate().then(() => {
                spy1.should.have.been.calledOnce;
                spy2.should.have.been.calledOnce;
            });
        });
        describe('promise behavior', () => {
            it('should resolve to self', () => {
                return forum.activate().should.become(forum);
            });
            it('should reject when websocket rejects', () => {
                forum.connectWebsocket.rejects('bad');
                return forum.activate().should.be.rejected;
            });
            it('should reject when user fetch rejects', () => {
                forum.User.getByName.onFirstCall().rejects('bad');
                return forum.activate().should.be.rejected;
            });
            it('should reject when owner fetch rejects', () => {
                forum.User.getByName.onSecondCall().rejects('bad');
                return forum.activate().should.be.rejected;
            });
            it('should reject when notification activation throw', () => {
                forum.Notification.activate.throws('bad');
                return forum.activate().should.be.rejected;
            });
            it('should reject when notification activation throw', () => {
                forum.Chat.activate.throws('bad');
                return forum.activate().should.be.rejected;
            });
            it('should reject when plugin activation rejects', () => {
                forum._plugins = [{
                    activate: sinon.stub().rejects('bad')
                }];
                return forum.activate().should.be.rejected;
            });
        });
    });
    describe('deactivate()', () => {
        let forum = null,
            sandbox = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            forum = new Forum({
                core: {}
            });
            sandbox.stub(forum.Notification, 'deactivate');
            sandbox.stub(forum.Chat, 'deactivate');
        });
        afterEach(() => sandbox.restore());
        it('should deactivate notifications', () => {
            return forum.deactivate().then(() => {
                forum.Notification.deactivate.should.have.been.calledOnce;
            });
        });
        it('should deactivate chat', () => {
            return forum.deactivate().then(() => {
                forum.Chat.deactivate.should.have.been.calledOnce;
            });
        });
        it('should deactivate plugins', () => {
            const spy1 = sinon.stub().resolves(),
                spy2 = sinon.stub().resolves();
            forum._plugins = [{
                deactivate: spy1
            }, {
                deactivate: spy2
            }];
            return forum.deactivate().then(() => {
                spy1.should.have.been.calledOnce;
                spy2.should.have.been.calledOnce;
            });
        });
        it('should resolve to self', () => {
            return forum.deactivate().should.become(forum);
        });
        it('should reject when notification deactivation throw', () => {
            forum.Notification.deactivate.throws('bad');
            return forum.deactivate().should.be.rejected;
        });
        it('should reject when chat deactivation throw', () => {
            forum.Chat.deactivate.throws('bad');
            return forum.deactivate().should.be.rejected;
        });
        it('should reject when plugin deactivation rejects', () => {
            forum._plugins = [{
                deactivate: sinon.stub().rejects('bad')
            }];
            return forum.deactivate().should.be.rejected;
        });
    });
    describe('supports', () => {
        let forum = null,
            sandbox = null;

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            forum = new Forum({
                core: {}
            });
            sandbox.stub(forum.Notification, 'deactivate');
            sandbox.stub(forum.Chat, 'deactivate');
        });
        afterEach(() => sandbox.restore());

        it('must expose a method named supports', () => {
            forum.supports.should.be.a('function');
        });

        it('must return false if a capability is unsupported', () => {
            forum.supports('Jack').should.be.false;
            forum.supports('PMs').should.be.false;
        });

        it('must return true if a capability is supported', () => {
            forum.supports('PrivateMessage').should.be.true;
            forum.supports('Users').should.be.true;
            forum.supports('Posts').should.be.true;
            forum.supports('Topics').should.be.true;
            forum.supports('Categories').should.be.true;
            forum.supports('Notifications').should.be.true;
            forum.supports('Formatting').should.be.true;
        });

        it('must return false if a sub-capability is not supported', () => {
            forum.supports('Jack.Skellington').should.be.false;
            forum.supports('Chats.WithJackSkellington').should.be.false;
        });

        it('must return true if a sub-capability is supported', () => {
            forum.supports('Users.Avatars').should.be.true;
        });

        it('should return true if all items in an array are supported', () => {
            forum.supports(['Users', 'PrivateMessage']).should.be.true;
        });

        it('must return false if any items in an array are not supported', () => {
            forum.supports(['Users', 'PrivateMessage', 'Halloween']).should.be.false;
        });
    });
    describe('_emit', () => {
        let forum = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            forum.socket = {
                emit: sinon.stub().yields()
            };
        });
        it('should use websocket emit', () => {
            return forum._emit().then(() => {
                forum.socket.emit.should.have.been.calledOnce;
            });
        });
        it('should bind websocket emit to websokcet', () => {
            return forum._emit().then(() => {
                forum.socket.emit.thisValues[0].should.equal(forum.socket);
            });
        });
        it('should pass arguments to websocket emit', () => {
            const evt = Math.random(),
                arg1 = Math.random(),
                arg2 = Math.random();
            return forum._emit(evt, arg1, arg2).then(() => {
                forum.socket.emit.should.have.been.calledWith(evt, arg1, arg2);
            });
        });
        it('should resolve to undefined on empty success', () => {

            forum.socket.emit.yields();
            return forum._emit().should.become(undefined);
        });
        it('should resolve to single vlaue on success', () => {
            const res = Math.random();
            forum.socket.emit.yields(null, res);
            return forum._emit().should.become(res);
        });
        it('should resolve to array on multi success', () => {
            const res1 = Math.random(),
                res2 = Math.random();
            forum.socket.emit.yields(null, res1, res2);
            return forum._emit().should.become([res1, res2]);
        });
        it('should reject when websocket errors', () => {
            forum.socket.emit.yields('bad');
            return forum._emit().should.be.rejectedWith('bad');
        });
        it('should unpack "serialized Error" when websocket errors', () => {
            forum.socket.emit.yields({
                message: 'bad'
            });
            return forum._emit().should.be.rejectedWith('bad');
        });
        it('should reject with Error when websocket errors with string', () => {
            forum.socket.emit.yields('bad');
            return forum._emit().should.be.rejectedWith(Error);
        });
        it('should reject with Error when websocket errors with Error', () => {
            forum.socket.emit.yields(new Error('bad'));
            return forum._emit().should.be.rejectedWith(Error);
        });
    });
    describe('_emit', () => {
        let forum = null,
            sandbox = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            forum = new Forum({
                core: {}
            });
            sandbox.stub(forum, '_emit').resolves();
        });
        afterEach(() => sandbox.restore());
        it('should proxy to _emit', () => {
            return forum._emitWithRetry(50).then(() => {
                forum._emit.calledOnce.should.be.true;
            });
        });
        it('should proxy to _emit preserving `this`', () => {
            return forum._emitWithRetry(50).then(() => {
                forum._emit.calledOn(forum).should.be.true;
            });
        });
        it('should proxy to _emit with expected params', () => {
            const args = [Math.random(), Math.random(), Math.random(), Math.random()];
            const params = args.slice();
            params.unshift(50);
            params.should.not.eql(args);
            return forum._emitWithRetry.apply(forum, params).then(() => {
                forum._emit.firstCall.args.should.eql(args);
            });
        });
        it('should not retry with wrong error', () => {
            const err = new Error('bad bad!');
            forum._emit.rejects(err);
            return forum._emitWithRetry(50, 'seven', 'ten').should.be.rejectedWith(err);
        });
        it('should retry with right error', () => {
            const err = new Error('[[error:too-many-bananas]]');
            forum._emit.onFirstCall().rejects(err);
            return forum._emitWithRetry(1, 'seven', 'ten').then(() => {
                forum._emit.callCount.should.equal(2);
            });
        });
        it('should retry limited times with right error', () => {
            const err = new Error('[[error:too-many-bananas]]');
            forum._emit.rejects(err);
            return forum._emitWithRetry(1, 'seven', 'ten').catch(() => {
                forum._emit.callCount.should.equal(5);
            });
        });
    });
    describe('fetchObject', () => {
        let forum = null,
            sandbox = null;
        beforeEach(() => {
            forum = new Forum({
                core: {}
            });
            sandbox = sinon.sandbox.create();
            sandbox.stub(forum, '_emit').resolves({});
        });
        it('should use self._emit', () => {
            return forum.fetchObject('', '', () => 0).then(() => {
                forum._emit.should.have.been.calledOnce;
            });
        });
        it('should pass arguments to _emit', () => {
            const func = Math.random(),
                id = Math.random(),
                parser = sinon.spy();
            return forum.fetchObject(func, id, parser).then(() => {
                forum._emit.should.have.been.calledWith(func, id);
            });
        });
        it('should pass result to parser', () => {
            const parser = sinon.spy();
            const expected = Math.random();
            forum._emit.resolves(expected);
            return forum.fetchObject('', '', parser).then(() => {
                parser.should.have.been.calledWith(expected);
            });
        });
        it('should resolve to results of parser', () => {
            const expected = Math.random();
            const parser = sinon.stub().returns(expected);
            forum._emit.resolves(expected);
            return forum.fetchObject('', '', parser).should.become(expected);
        });
        it('should reject when websocket errors', () => {
            forum._emit.rejects('bad');
            return forum.fetchObject().should.be.rejected;
        });
        it('should reject when parser throws', () => {
            const parser = sinon.stub().throws('bad');
            return forum.fetchObject('', '', parser).should.be.rejected;
        });
    });
});
