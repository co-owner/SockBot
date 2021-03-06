'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
chai.use(require('sinon-chai'));

const testModule = require('../../../providers/nodebb/chat');
const utils = require('../../../lib/utils');

describe('providers/nodebb/chat', () => {
    it('should export bindChat()', () => {
        testModule.bindChat.should.be.a('function');
    });
    it('should return a class on call to bindChat()', () => {
        testModule.bindChat({}).should.be.a('function');
    });
    describe('ChatRoom', () => {
        let ChatRoom = null,
            forum = null;
        beforeEach(() => {
            forum = {
                _emit: sinon.stub().resolves()
            };
            ChatRoom = testModule.bindChat(forum);
        });
        it('should expose the Message class as a field', () => {
            ChatRoom.Message.should.be.a('function');
            ChatRoom.Message.parse.should.be.a('function');
        });
        describe('ctor()', () => {
            it('should store instance data in utils.storage', () => {
                const room = new ChatRoom({});
                utils.mapGet(room).should.be.ok;
            });
            it('should accept serialized input', () => {
                const room = new ChatRoom('{}');
                utils.mapGet(room).should.be.ok;
            });
            [
                ['id', 'roomId'],
                ['name', 'roomName'],
                ['owner', 'owner'],
                ['users', 'users']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const room = new ChatRoom(values);
                    utils.mapGet(room, outKey).should.equal(expected);
                });
            });
        });
        describe('getters', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                forum.User = {
                    parse: sinon.stub()
                };
            });
            it('`id`: should retrieve `id` from storage', () => {
                const expected = Math.random();
                data.id = expected;
                room.id.should.equal(expected);
            });
            it('`name`: should retrieve `name` from storage', () => {
                const expected = `name${Math.random()}`;
                data.name = expected;
                room.name.should.equal(expected);
            });
            it('`participants`: should retrieve users length from storage', () => {
                const expected = Math.random();
                data.users = {
                    length: expected
                };
                room.participants.should.equal(expected);
            });
            describe('users', () => {
                it('should return results as returned by forum.User.parse()', () => {
                    const userdata = `{name:user${Math.random()}}`;
                    const user = Math.random();
                    forum.User.parse.returns(user);
                    data.users = [userdata];
                    room.users.should.eql([user]);
                    forum.User.parse.should.have.been.calledWith(userdata);
                });
                it('should return sequential results for multiple users', () => {
                    const expected = Math.random();
                    forum.User.parse.returns(expected);
                    forum.User.parse.onSecondCall().returns(expected + 1);
                    forum.User.parse.onThirdCall().returns(expected + 2);
                    data.users = [1, 2, 3];
                    room.users.should.eql([expected, expected + 1, expected + 2]);
                });
            });
            it('owner', () => {
                const owner = {
                    uid: Math.random()
                };
                data.owner = owner.uid;
                data.users = [{
                    uid: 1 + Math.random()
                }, owner, {
                    uid: 2 + Math.random()
                }];
                const expected = Math.random();
                forum.User.parse.returns(expected);
                room.owner.should.equal(expected);
                forum.User.parse.should.have.been.calledWith(owner);
                forum.User.parse.callCount.should.equal(1);
            });
        });
        describe('url()', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                forum.User = {
                    parse: sinon.stub()
                };
            });
            it('should construct url with forum url as base', () => {
                forum.url = `base${Math.random()}`;
                return room.url().then((url) => {
                    url.should.startWith(forum.url);
                });
            });
            it('should construct url with forum url as base', () => {
                data.id = Math.random();
                return room.url().then((url) => {
                    url.should.endWith(`chats/${data.id}`);
                });
            });
            it('should construct full url', () => {
                forum.url = `base${Math.random()}`;
                data.id = Math.random();
                return room.url().then((url) => {
                    url.should.equal(`${forum.url}/chats/${data.id}`);
                });
            });
        });
        describe('send()', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                data.id = Math.random();
                ChatRoom.retryDelay = 1;
            });
            it('should reject when emit rejects', () => {
                forum._emit.rejects('bad');
                return room.send('foo').should.be.rejected;
            });
            it('should emit `modules.chats.send` to reply', () => {
                return room.send('some content').then(() => {
                    forum._emit.should.have.been.calledWith('modules.chats.send');
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should select room id from ChatRoom', () => {
                return room.send('some content').then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.roomId.should.equal(data.id);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should set content via parameter', () => {
                const content = `rabblerabble${Math.random()}`;
                return room.send(content).then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.message.should.equal(content);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should set expected parameter keys', () => {
                return room.send('foo').then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.should.have.keys(['message', 'roomId']);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should resolve to self for method chaining', () => {
                return room.send('foo').should.become(room);
            });
            it('should retry when send fails for rate limit', () => {
                const message = `message${Math.random()}`;
                forum._emit.onFirstCall().rejects({
                    message: '[[error:too-many-messages]]'
                });
                return room.send(message).then(() => {
                    forum._emit.should.have.been.calledTwice;
                });
            });
            it('should reject when multirate limited', () => {
                const message = `message${Math.random()}`;
                forum._emit.rejects({
                    message: '[[error:too-many-messages]]'
                });
                return room.send(message).should.be.rejectedWith('[[error:too-many-messages]]');
            });
            it('should retry five times when rate limited', () => {
                const message = `message${Math.random()}`;
                forum._emit.rejects({
                    message: '[[error:too-many-messages]]'
                });
                return room.send(message).catch(() => {
                    forum._emit.should.have.callCount(5);
                });
            });
        });
        describe('addUsers()', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                data.id = Math.random();
            });
            it('should resolve to self for method chaining', () => {
                return room.addUsers({
                    username: 'foo'
                }).should.become(room);
            });
            it('should accept empty array of users to add', () => {
                return room.addUsers([]).then(() => {
                    forum._emit.callCount.should.equal(0);
                });
            });
            describe('single user record', () => {
                it('should reject when socket call rejects', () => {
                    forum._emit.rejects('bad');
                    return room.addUsers({}).should.be.rejected;
                });
                it('should add via `modules.chats.addUserToRoom`', () => {
                    return room.addUsers({
                        username: 'foobar'
                    }).then(() => {
                        forum._emit.should.have.been.calledWith('modules.chats.addUserToRoom');
                    });
                });
                it('should add single user to room by room id', () => {
                    return room.addUsers({
                        username: 'foobar'
                    }).then(() => {
                        forum._emit.callCount.should.equal(1);
                        const params = forum._emit.firstCall.args[1];
                        params.roomId.should.equal(data.id);
                    });
                });
                it('should add single user', () => {
                    const name = `username${Math.random()}`;
                    return room.addUsers({
                        username: name
                    }).then(() => {
                        forum._emit.callCount.should.equal(1);
                        const params = forum._emit.firstCall.args[1];
                        params.username.should.equal(name);
                    });
                });
                it('should add single user with expected keys', () => {
                    const name = `username${Math.random()}`;
                    return room.addUsers({
                        username: name
                    }).then(() => {
                        forum._emit.callCount.should.equal(1);
                        const params = forum._emit.firstCall.args[1];
                        params.should.have.keys(['roomId', 'username']);
                    });
                });
            });
            describe('multiple user records', () => {
                it('should add via `modules.chats.addUserToRoom`', () => {
                    return room.addUsers([{
                        username: 'foobar'
                    }, {
                        username: 'barbaz'
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        forum._emit.firstCall.should.have.been.calledWith('modules.chats.addUserToRoom');
                        forum._emit.secondCall.should.have.been.calledWith('modules.chats.addUserToRoom');
                    });
                });
                it('should reject when any socket call rejects', () => {
                    forum._emit.onSecondCall().rejects('bad');
                    return room.addUsers([{}, {}]).should.be.rejected;
                });
                it('should add multiple users to room by room id', () => {
                    return room.addUsers([{
                        username: 'foobar'
                    }, {
                        username: 'barbaz'
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        let params = forum._emit.firstCall.args[1];
                        params.roomId.should.equal(data.id);
                        params = forum._emit.secondCall.args[1];
                        params.roomId.should.equal(data.id);
                    });
                });
                it('should add multiple users ', () => {
                    const name = `username${Math.random()}`;
                    return room.addUsers([{
                        username: name
                    }, {
                        username: name + 1
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        let params = forum._emit.firstCall.args[1];
                        params.username.should.equal(name);
                        params = forum._emit.secondCall.args[1];
                        params.username.should.equal(name + 1);
                    });
                });
                it('should add multiple users with expected keys', () => {
                    const name = `username${Math.random()}`;
                    return room.addUsers([{
                        username: name
                    }, {
                        username: name + 1
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        forum._emit.firstCall.args[1].should.have.keys(['roomId', 'username']);
                        forum._emit.secondCall.args[1].should.have.keys(['roomId', 'username']);
                    });
                });
            });
        });
        describe('removeUsers()', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                data.id = Math.random();
            });
            it('should resolve to self for method chaining', () => {
                return room.removeUsers({
                    username: 'foo'
                }).should.become(room);
            });
            it('should accept empty array of users to remove', () => {
                return room.removeUsers([]).then(() => {
                    forum._emit.callCount.should.equal(0);
                });
            });
            describe('single user record', () => {
                it('should reject when socket call rejects', () => {
                    forum._emit.rejects('bad');
                    return room.removeUsers({}).should.be.rejected;
                });
                it('should add via `modules.chats.removeUserFromRoom`', () => {
                    return room.removeUsers({
                        username: 'foobar'
                    }).then(() => {
                        forum._emit.should.have.been.calledWith('modules.chats.removeUserFromRoom');
                    });
                });
                it('should remove single user to room by room id', () => {
                    return room.removeUsers({
                        username: 'foobar'
                    }).then(() => {
                        forum._emit.callCount.should.equal(1);
                        const params = forum._emit.firstCall.args[1];
                        params.roomId.should.equal(data.id);
                    });
                });
                it('should remove single user', () => {
                    const name = `username${Math.random()}`;
                    return room.removeUsers({
                        username: name
                    }).then(() => {
                        forum._emit.callCount.should.equal(1);
                        const params = forum._emit.firstCall.args[1];
                        params.username.should.equal(name);
                    });
                });
                it('should remove single user with expected keys', () => {
                    const name = `username${Math.random()}`;
                    return room.removeUsers({
                        username: name
                    }).then(() => {
                        forum._emit.callCount.should.equal(1);
                        const params = forum._emit.firstCall.args[1];
                        params.should.have.keys(['roomId', 'username']);
                    });
                });
            });
            describe('multiple user records', () => {
                it('should remove via `modules.chats.removeUserFromRoom`', () => {
                    return room.removeUsers([{
                        username: 'foobar'
                    }, {
                        username: 'barbaz'
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        forum._emit.firstCall.should.have.been.calledWith('modules.chats.removeUserFromRoom');
                        forum._emit.secondCall.should.have.been.calledWith('modules.chats.removeUserFromRoom');
                    });
                });
                it('should reject when any socket call rejects', () => {
                    forum._emit.onSecondCall().rejects('bad');
                    return room.removeUsers([{}, {}]).should.be.rejected;
                });
                it('should remove multiple users to room by room id', () => {
                    return room.removeUsers([{
                        username: 'foobar'
                    }, {
                        username: 'barbaz'
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        let params = forum._emit.firstCall.args[1];
                        params.roomId.should.equal(data.id);
                        params = forum._emit.secondCall.args[1];
                        params.roomId.should.equal(data.id);
                    });
                });
                it('should remove multiple users ', () => {
                    const name = `username${Math.random()}`;
                    return room.removeUsers([{
                        username: name
                    }, {
                        username: name + 1
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        let params = forum._emit.firstCall.args[1];
                        params.username.should.equal(name);
                        params = forum._emit.secondCall.args[1];
                        params.username.should.equal(name + 1);
                    });
                });
                it('should remove multiple users with expected keys', () => {
                    const name = `username${Math.random()}`;
                    return room.removeUsers([{
                        username: name
                    }, {
                        username: name + 1
                    }]).then(() => {
                        forum._emit.callCount.should.equal(2);
                        forum._emit.firstCall.args[1].should.have.keys(['roomId', 'username']);
                        forum._emit.secondCall.args[1].should.have.keys(['roomId', 'username']);
                    });
                });
            });
        });
        describe('leave()', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                data.id = Math.random();
            });
            it('should resolve to self for method chaining', () => {
                return room.leave().should.become(room);
            });
            it('should emit expected message', () => {
                return room.leave().then(() => {
                    forum._emit.calledWith('modules.chats.leave', data.id);
                });
            });
            it('should reject when websocket rejects', () => {
                forum._emit.rejects('bad');
                return room.leave().should.be.rejected;
            });
        });
        describe('rename()', () => {
            let data = null,
                room = null;
            beforeEach(() => {
                room = new ChatRoom({});
                data = utils.mapGet(room);
                data.id = Math.random();
            });
            it('should reject when emit rejects', () => {
                forum._emit.rejects('bad');
                return room.rename('foo').should.be.rejected;
            });
            it('should emit `modules.chats.renameRoom` to reply', () => {
                return room.rename('some content').then(() => {
                    forum._emit.should.have.been.calledWith('modules.chats.renameRoom');
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should select room id from ChatRoom', () => {
                return room.rename('some content').then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.roomId.should.equal(data.id);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should set content via parameter', () => {
                const name = `rabblerabble${Math.random()}`;
                return room.rename(name).then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.newName.should.equal(name);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should set expected parameter keys', () => {
                return room.rename('foo').then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.should.have.keys(['newName', 'roomId']);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should resolve to self for method chaining', () => {
                return room.rename('foo').should.become(room);
            });
        });
        describe('static create()', () => {
            let room = null,
                sandbox = null,
                id = null,
                delay = null;
            beforeEach(() => {
                sandbox = sinon.sandbox.create();
                sandbox.stub(ChatRoom, 'get');
                id = Math.random();
                forum._emit.resolves(id);
                room = {
                    addUsers: sinon.stub().resolves(),
                    send: sinon.stub().resolves(),
                    rename: sinon.stub().resolves()
                };
                room.addUsers.resolves(room);
                room.send.resolves(room);
                room.rename.resolves(room);
                ChatRoom.get.resolves(room);
                delay = ChatRoom.retryDelay;
                ChatRoom.retryDelay = 1;
            });
            afterEach(() => {
                sandbox.restore();
                ChatRoom.retryDelay = delay;
            });
            it('should create room via `modules.chats.newRoom', () => {
                return ChatRoom.create({}, '').then(() => {
                    forum._emit.should.have.been.calledWith('modules.chats.newRoom');
                });
            });
            it('should add initial user to new chatroom', () => {
                const userid = Math.random();
                return ChatRoom.create({
                    id: userid
                }, '').then(() => {
                    forum._emit.firstCall.args[1].touid.should.equal(userid);
                });
            });
            it('should add initial user from arrayto new chatroom', () => {
                const userid = Math.random();
                return ChatRoom.create([{
                    id: userid
                }], '').then(() => {
                    forum._emit.firstCall.args[1].touid.should.equal(userid);
                });
            });
            it('should create chatroom with expected parameters set', () => {
                return ChatRoom.create({}, '').then(() => {
                    forum._emit.firstCall.args[1].should.have.all.keys('touid');
                });
            });
            it('should get chatroom with new room id', () => {
                return ChatRoom.create({}, '').then(() => {
                    ChatRoom.get.should.have.been.calledWith(id);
                });
            });
            it('should add additional user to chatroom', () => {
                const additionalUsers = [{
                    id: 2 + Math.random()
                }, {
                    id: 3 + Math.random()
                }, {
                    id: 4 + Math.random()
                }, {
                    id: 5 + Math.random()
                }, {
                    id: 6 + Math.random()
                }];
                const user = [{
                    id: 1 + Math.random()
                }];
                return ChatRoom.create(user.concat(additionalUsers), '').then(() => {
                    room.addUsers.firstCall.args[0].should.eql(additionalUsers);
                });
            });
            it('should send message to new chatroom', () => {
                const message = `message${Math.random()}`;
                return ChatRoom.create({}, message).then(() => {
                    room.send.should.have.been.calledWith(message);
                });
            });
            it('should add users to new chatroom before sending message', () => {
                return ChatRoom.create({}, '').then(() => {
                    room.addUsers.calledBefore(room.send).should.be.true;
                });
            });
            it('should retry when room creation fails for rate limit', () => {
                const message = `message${Math.random()}`;
                forum._emit.onFirstCall().rejects({
                    message: '[[error:too-many-messages]]'
                });
                return ChatRoom.create({}, message).then(() => {
                    forum._emit.should.have.been.calledTwice;
                });
            });
            it('should reject when multirate limited', () => {
                const message = `message${Math.random()}`;
                forum._emit.rejects({
                    message: '[[error:too-many-messages]]'
                });
                return ChatRoom.create({}, message).should.be.rejectedWith('[[error:too-many-messages]]');
            });
            it('should retry five times when rate limited', () => {
                const message = `message${Math.random()}`;
                forum._emit.rejects({
                    message: '[[error:too-many-messages]]'
                });
                return ChatRoom.create({}, message).catch(() => {
                    forum._emit.should.have.callCount(5);
                });
            });
            it('should reject when room creation rejects', () => {
                forum._emit.rejects('bad');
                return ChatRoom.create({}, '').should.be.rejected;
            });
            it('should reject when room fetch rejects', () => {
                ChatRoom.get.rejects('bad');
                return ChatRoom.create({}, '').should.be.rejected;
            });
            it('should reject when adding additional users rejects', () => {
                room.addUsers.rejects('bad');
                return ChatRoom.create({}, '').should.be.rejected;
            });
            it('should reject when sending message rejects', () => {
                room.send.rejects('bad');
                return ChatRoom.create({}, '').should.be.rejected;
            });
            it('should resolve to self for method chaining', () => {
                return ChatRoom.create('foo', 'bar').should.become(room);
            });
            describe('Set Chat Title', () => {
                it('should not set title when title not provided', () => {
                    return ChatRoom.create('foo', 'bar').then(() => {
                        room.rename.should.not.be.called;
                    });
                });
                it('should not set title when title is falsy', () => {
                    return ChatRoom.create('foo', 'bar', '').then(() => {
                        room.rename.should.not.be.called;
                    });
                });
                it('should set title when title provided', () => {
                    const expected = `title${Math.random()}`;
                    return ChatRoom.create('foo', 'bar', expected).then(() => {
                        room.rename.should.be.calledWith(expected);
                    });
                });
            });
        });
        describe('static activate()', () => {
            beforeEach(() => {
                forum.socket = {
                    on: sinon.stub()
                };
            });
            it('should register event listener for `event:chats.receive`', () => {
                ChatRoom.activate();
                forum.socket.on.should.have.been.calledWith('event:chats.receive');
            });
            it('should register handler for `event:chats.receive`', () => {
                ChatRoom.activate();
                forum.socket.on.firstCall.args[1].should.be.a('function');
            });
        });
        describe('static deactivate()', () => {
            beforeEach(() => {
                forum.socket = {
                    off: sinon.stub()
                };
            });
            it('should unregister event listener for `event:chats.receive`', () => {
                ChatRoom.deactivate();
                forum.socket.off.should.have.been.calledWith('event:chats.receive');
            });
            it('should unregister handler for `event:chats.receive`', () => {
                ChatRoom.deactivate();
                forum.socket.off.firstCall.args[1].should.be.a('function');
            });
        });
        describe('static get()', () => {
            let sandbox = null;
            beforeEach(() => {
                sandbox = sinon.sandbox.create();
                sandbox.stub(ChatRoom, 'parse');
            });
            afterEach(() => sandbox.restore());
            it('should emit `modules.chats.loadRoom`', () => {
                return ChatRoom.get().then(() => {
                    forum._emit.should.have.been.calledWith('modules.chats.loadRoom');
                });
            });
            it('should emit with expected arguments', () => {
                const id = Math.random();
                return ChatRoom.get(id).then(() => {
                    const params = forum._emit.firstCall.args[1];
                    params.should.have.all.keys(['roomId']);
                    params.roomId.should.equal(id);
                });
            });
            it('should parse results with ChatRoom.parse', () => {
                const results = Math.random();
                forum._emit.resolves(results);
                return ChatRoom.get().then(() => {
                    ChatRoom.parse.should.have.been.calledWith(results);
                });
            });
        });
        describe('static parse()', () => {
            it('should throw error on falsy payload', () => {
                chai.expect(() => ChatRoom.parse()).to.throw('E_CHATROOM_NOT_FOUND');
            });
            it('should store instance data in utils.storage', () => {
                const room = ChatRoom.parse({});
                utils.mapGet(room).should.be.ok;
            });
            it('should accept serialized input', () => {
                const room = ChatRoom.parse('{}');
                utils.mapGet(room).should.be.ok;
            });
            [
                ['id', 'roomId'],
                ['name', 'roomName'],
                ['owner', 'owner'],
                ['users', 'users']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const room = ChatRoom.parse(values);
                    utils.mapGet(room, outKey).should.equal(expected);
                });
            });
        });
    });
    describe('ChatRoom.Message', () => {
        let Message = null,
            forum = null;
        beforeEach(() => {
            forum = {
                _emit: sinon.stub().resolves(),
                User: {
                    parse: sinon.stub()
                }
            };
            const ChatRoom = testModule.bindChat(forum);
            ChatRoom.retryDelay = 1;
            Message = ChatRoom.Message;
        });
        describe('ctor()', () => {
            it('should store instance data in utils.storage', () => {
                const message = new Message({});
                utils.mapGet(message).should.be.ok;
            });
            it('should accept serialized input', () => {
                const message = new Message('{}');
                utils.mapGet(message).should.be.ok;
            });
            [
                ['id', 'messageId'],
                ['markup', 'content'],
                ['room', 'roomId']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const message = new Message(values);
                    utils.mapGet(message, outKey).should.equal(expected);
                });
            });
            it('should strip markup from content', () => {
                const message = new Message({
                    content: '<a href="#"><b>foobar</a></b>'
                });
                utils.mapGet(message, 'content').should.equal('foobar');
            });
            it('should parse user from payload', () => {
                const userData = Math.random();
                const user = Math.random();
                forum.User.parse.returns(user);
                const message = new Message({
                    fromUser: userData
                });
                forum.User.parse.should.have.been.calledWith(userData);
                utils.mapGet(message, 'from').should.equal(user);
            });
            it('should date from timestamp', () => {
                const stamp = 1e12 + 1e11 * Math.random(); // roughly 2001-2004
                const expected = new Date(stamp).toISOString();
                const message = new Message({
                    timestamp: stamp
                });
                utils.mapGet(message, 'sent').toISOString().should.equal(expected);
            });
            it('should flag self on self post', () => {
                const message = new Message({
                    self: 1
                });
                utils.mapGet(message, 'self').should.be.true;
            });
            it('should not flag self on others post', () => {
                const message = new Message({
                    self: 0
                });
                utils.mapGet(message, 'self').should.be.false;
            });
            it('should not flag self on invalid self flag', () => {
                const message = new Message({
                    self: 'tomato'
                });
                utils.mapGet(message, 'self').should.be.false;
            });
        });
        describe('getters', () => {
            let data = null,
                message = null;
            beforeEach(() => {
                message = new Message({});
                data = utils.mapGet(message);
            });
            ['id', 'room', 'from', 'self', 'content', 'sent'].forEach((key) => {
                it(`should store ${key} in utils.storage`, () => {
                    const expected = Math.random();
                    data[key] = expected;
                    message[key].should.equal(expected);
                });
            });
            it('should store markup in utils.storage', () => {
                const expected = Math.random();
                data.markup = expected;
                return message.markup().should.become(expected);
            });
        });
        describe('reply()', () => {
            let data = null,
                message = null;
            beforeEach(() => {
                message = new Message({});
                data = utils.mapGet(message);
                data.room = Math.random();
            });
            it('should reject when emit rejects', () => {
                forum._emit.rejects('bad');
                return message.reply('foo').should.be.rejected;
            });
            it('should retry when send fails for rate limit', () => {
                const content = `message${Math.random()}`;
                forum._emit.onFirstCall().rejects({
                    message: '[[error:too-many-messages]]'
                });
                return message.reply(content).then(() => {
                    forum._emit.should.have.been.calledTwice;
                });
            });
            it('should reject when multirate limited', () => {
                const content = `message${Math.random()}`;
                forum._emit.rejects({
                    message: '[[error:too-many-messages]]'
                });
                return message.reply(content).should.be.rejectedWith('[[error:too-many-messages]]');
            });
            it('should retry five times when rate limited', () => {
                const content = `message${Math.random()}`;
                forum._emit.rejects({
                    message: '[[error:too-many-messages]]'
                });
                return message.reply(content).catch(() => {
                    forum._emit.should.have.callCount(5);
                });
            });
            it('should emit `modules.chats.send` to reply', () => {
                return message.reply('some content').then(() => {
                    forum._emit.should.have.been.calledWith('modules.chats.send');
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should select room id from ChatRoom', () => {
                return message.reply('some content').then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.roomId.should.equal(data.room);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should set content via parameter', () => {
                const content = `rabblerabble${Math.random()}`;
                return message.reply(content).then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.message.should.equal(content);
                    forum._emit.callCount.should.equal(1);
                });
            });
            it('should set expected parameter keys', () => {
                return message.reply('foo').then(() => {
                    const param = forum._emit.firstCall.args[1];
                    param.should.have.keys(['message', 'roomId']);
                    forum._emit.callCount.should.equal(1);
                });
            });
        });
        describe('static parse()', () => {
            it('should throw error on falsy payload', () => {
                chai.expect(() => Message.parse()).to.throw('E_CHATMESSAGE_NOT_FOUND');
            });
            it('should store instance data in utils.storage', () => {
                const message = Message.parse({});
                utils.mapGet(message).should.be.ok;
            });
            it('should accept serialized input', () => {
                const message = Message.parse('{}');
                utils.mapGet(message).should.be.ok;
            });
            [
                ['id', 'messageId'],
                ['markup', 'content'],
                ['room', 'roomId']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const message = Message.parse(values);
                    utils.mapGet(message, outKey).should.equal(expected);
                });
            });
            it('should strip markup from content', () => {
                const message = Message.parse({
                    content: '<a href="#"><b>foobar</a></b>'
                });
                utils.mapGet(message, 'content').should.equal('foobar');
            });
            it('should parse user from payload', () => {
                const userData = Math.random();
                const user = Math.random();
                forum.User.parse.returns(user);
                const message = Message.parse({
                    fromUser: userData
                });
                forum.User.parse.should.have.been.calledWith(userData);
                utils.mapGet(message, 'from').should.equal(user);
            });
            it('should date from timestamp', () => {
                const stamp = 1e12 + 1e11 * Math.random(); // roughly 2001-2004
                const expected = new Date(stamp).toISOString();
                const message = Message.parse({
                    timestamp: stamp
                });
                utils.mapGet(message, 'sent').toISOString().should.equal(expected);
            });
            it('should flag self on self post', () => {
                const message = Message.parse({
                    self: 1
                });
                utils.mapGet(message, 'self').should.be.true;
            });
            it('should not flag self on others post', () => {
                const message = Message.parse({
                    self: 0
                });
                utils.mapGet(message, 'self').should.be.false;
            });
            it('should not flag self on invalid self flag', () => {
                const message = Message.parse({
                    self: 'tomato'
                });
                utils.mapGet(message, 'self').should.be.false;
            });
        });
    });
    describe('handleChat()', () => {
        let handleChat = null,
            message = null,
            forum = null,
            command = null,
            ChatRoom = null;
        beforeEach(() => {
            message = {
                from: {
                    id: Math.random()
                },
                room: Math.random(),
                reply: sinon.stub()
            };
            command = {
                execute: sinon.stub().resolves()
            };
            forum = {
                _emit: sinon.stub().resolves(),
                emit: sinon.stub(),
                socket: {
                    on: (_, handler) => {
                        handleChat = handler;
                    }
                },
                Commands: {
                    get: sinon.stub().resolves(command)
                }
            };
            ChatRoom = testModule.bindChat(forum);
            ChatRoom.activate();
            ChatRoom.Message.parse = sinon.stub().returns(message);
        });
        it('should parse message from payload', () => {
            const payload = Math.random();
            return handleChat({
                message: payload
            }).then(() => {
                ChatRoom.Message.parse.should.have.been.calledWith(payload);
            });
        });
        it('should emit `chatMessage` event', () => {
            const expected = {
                from: {
                    id: Math.random()
                }
            };
            ChatRoom.Message.parse.returns(expected);
            return handleChat({
                message: true
            }).then(() => {
                forum.emit.should.have.been.calledWith('chatMessage', expected);
            });
        });
        it('should parse content for commands', () => {
            return handleChat({
                message: 1
            }).then(() => {
                forum.Commands.get.callCount.should.equal(1);
            });
        });
        it('should provide expected ids to Commands parsing', () => {
            const chatId = Math.random();
            message.id = chatId;
            const roomId = Math.random();
            message.room = roomId;
            const userId = Math.random();
            message.from.id = userId;
            return handleChat({
                message: 1
            }).then(() => {
                const param = forum.Commands.get.firstCall.args[0];
                param.should.have.all.keys('post', 'topic', 'user', 'pm', 'chat');
                param.post.should.equal(-1);
                param.topic.should.equal(-1);
                param.user.should.equal(userId);
                param.pm.should.equal(roomId);
                param.chat.should.equal(chatId);
            });
        });
        it('should provide message content to commands parsing', () => {
            const expected = `!command${Math.random()} goes here`;
            message.content = expected;
            return handleChat({
                message: 1
            }).then(() => {
                const param = forum.Commands.get.firstCall.args[1];
                param.should.equal(expected);
            });
        });
        it('should provide reply adaptor to commands parsing', () => {
            return handleChat({
                message: 1
            }).then(() => {
                const adaptor = forum.Commands.get.firstCall.args[2];
                adaptor.should.be.a('function');
                const expected = Math.random();
                adaptor(expected);
                message.reply.should.have.been.calledWith(expected);
            });
        });
        it('should execute retrieved commands', () => {
            return handleChat({
                message: 1
            }).then(() => {
                command.execute.should.have.been.calledOnce;
                command.execute.calledAfter(forum.Commands.get).should.be.true;
            });
        });
        it('should abort execution when input does not contain a message', () => {
            return handleChat({}).should.be.rejectedWith('Event payload did not include chat message');
        });
        it('should throw when Message.parse throws', () => {
            const expected = new Error('bad');
            ChatRoom.Message.parse.throws(expected);
            chai.expect(() => handleChat({
                message: 1
            })).to.throw(expected);
        });
        it('should reject when forum.Commands.get rejects', () => {
            forum.Commands.get.rejects('bad');
            return handleChat({
                message: 4
            }).should.be.rejected;
        });
        it('should reject when command.execute rejects', () => {
            command.execute.rejects('bad');
            return handleChat({
                message: 4
            }).should.be.rejected;
        });
    });
});
