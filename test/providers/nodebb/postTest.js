'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
chai.use(require('sinon-chai'));

const postModule = require('../../../providers/nodebb/post');
const utils = require('../../../lib/utils');

describe('providers/nodebb/post', () => {
    it('should export bindPost()', () => {
        postModule.bindPost.should.be.a('function');
    });
    it('should return a class on call to bindPost()', () => {
        postModule.bindPost({}).should.be.a('function');
    });
    describe('Post', () => {
        const forum = {};
        const Post = postModule.bindPost(forum);
        beforeEach(() => {
            forum._emit = sinon.stub().resolves();
            forum._emitWithRetry = sinon.stub().resolves();
            forum.fetchObject = sinon.stub().resolves();
        });
        describe('ctor()', () => {
            it('should store instance data in utils.storage', () => {
                const post = new Post({});
                utils.mapGet(post).should.be.ok;
            });
            it('should accept serialized input', () => {
                const post = new Post('{}');
                utils.mapGet(post).should.be.ok;
            });
            [
                ['authorId', 'uid'],
                ['content', 'content'],
                ['id', 'pid'],
                ['topicId', 'tid']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const post = new Post(values);
                    utils.mapGet(post, outKey).should.equal(expected);
                });
            });
            it('should parse timestamp for posted', () => {
                const expected = Math.round(Math.random() * (2 << 29));
                const user = new Post({
                    timestamp: expected
                });
                utils.mapGet(user, 'posted').getTime().should.equal(expected);
            });
        });
        describe('simple getters', () => {
            let post, data;
            beforeEach(() => {
                post = new Post({});
                data = utils.mapGet(post);
            });
            ['id', 'authorId', 'content', 'topicId', 'posted'].forEach((key) => {
                it(`should get value from utils.storage for ${key}`, () => {
                    const expected = `${Math.random()}${Math.random()}`;
                    data[key] = expected;
                    post[key].should.equal(expected);
                });
            });
        });
        describe('markup()', () => {
            let post = null,
                data = null,
                sandbox = null;
            beforeEach(() => {
                sandbox = sinon.sandbox.create();
                sandbox.stub(Post, 'preview').resolves();
                post = new Post({});
                data = utils.mapGet(post);
            });
            afterEach(() => sandbox.restore());
            it('should proxy markup() to Post.preview()', () => {
                return post.markup().then(() => {
                    Post.preview.should.have.been.calledOnce;
                });
            });
            it('should resolve to results toresults of Post.preview()', () => {
                const expected = Math.random();
                Post.preview.resolves(expected);
                return post.markup().should.become(expected);
            });
            it('should pass contents to Post.preview()', () => {
                const expected = Math.random();
                data.content = expected;
                return post.markup().then(() => {
                    Post.preview.should.have.been.calledWith(expected);
                });
            });
        });
        describe('url()', () => {
            let post = null,
                data = null;
            beforeEach(() => {
                post = new Post({});
                data = utils.mapGet(post);
                forum.Format = {
                    urlForPost: sinon.stub()
                };
            });
            it('should return a promise', () => {
                chai.expect(post.url()).to.be.an.instanceOf(Promise);
            });
            it('should pass postId to urlForPost', () => {
                const expected = Math.random();
                data.id = expected;
                return post.url().then(() => {
                    forum.Format.urlForPost.should.have.been.calledWith(expected);
                });
            });
            it('should resolve to result of urlForPost', () => {
                const expected = `/url/for/post/${Math.random()}`;
                forum.Format.urlForPost.returns(expected);
                return post.url().should.become(expected);
            });
            it('should reject when urlForPost throws', () => {
                const error = new Error(`/url/for/post/${Math.random()}`);
                forum.Format.urlForPost.throws(error);
                return post.url().should.be.rejectedWith(error);
            });
        });
        describe('reply()', () => {
            let post = null,
                data = null,
                sandbox = null;
            beforeEach(() => {
                sandbox = sinon.sandbox.create();
                sandbox.stub(Post, 'reply').resolves();
                post = new Post({});
                data = utils.mapGet(post);
            });
            afterEach(() => sandbox.restore());
            it('should proxy to Post.reply()', () => {
                return post.reply('').then(() => {
                    Post.reply.should.have.been.calledOnce;
                });
            });
            it('should pass post id, topicId and content to Post.reply()', () => {
                const id = Math.random();
                const topicId = Math.random();
                const content = `a${Math.random()}b`;
                data.id = id;
                data.topicId = topicId;
                return post.reply(content).then(() => {
                    Post.reply.should.have.been.calledWith(topicId, id, content);
                });
            });
            it('should resolve to results of Post.reply()', () => {
                const expected = Math.random();
                Post.reply.resolves(expected);
                return post.reply('').should.become(expected);
            });
            it('should resolve to results of Post._retryReply()', () => {
                Post.reply.rejects('bad');
                return post.reply('').should.be.rejected;
            });
        });
        describe('edit()', () => {
            let post = null,
                data = null,
                sandbox = null;
            beforeEach(() => {
                sandbox = sinon.sandbox.create();
                sandbox.stub(Post, 'parse').resolves();
                post = new Post({});
                data = utils.mapGet(post);
                forum._emit = sinon.stub().resolves({});
            });
            afterEach(() => sandbox.restore());
            it('should emit `plugins.composer.push` to retrieve post values', () => {
                data.id = Math.random();
                return post.edit('').then(() => {
                    forum._emit.should.have.been.calledWith('plugins.composer.push', data.id);
                });
            });
            it('should emit `posts.edit` to edit post', () => {
                data.id = Math.random();
                return post.edit('').then(() => {
                    forum._emitWithRetry.should.have.been.calledWith(10000, 'posts.edit');
                });
            });
            it('should combine data from composer to pass to `posts.edit`', () => {
                const id = Math.random();
                const tags = Math.random();
                const title = Math.random();
                const content = Math.random();
                data.id = Math.random();
                forum._emit.onFirstCall().resolves({
                    pid: id,
                    tags: tags,
                    title: title
                });
                return post.edit(content).then(() => {
                    forum._emitWithRetry.calledWith(10000, 'posts.edit', {
                        pid: id,
                        tags: tags,
                        title: title,
                        content: content
                    }).should.be.true;
                });
            });
            it('should reject if `plugins.composer.push` rejects', () => {
                forum._emit.rejects('bad');
                return post.edit('').should.be.rejected;
            });
            it('should reject if `posts.edit` rejects', () => {
                forum._emitWithRetry.rejects('bad');
                return post.edit('').should.be.rejected;
            });
            it('should parse edit results via Post.parse()', () => {
                const expected = Math.random();
                forum._emitWithRetry.resolves(expected);
                return post.edit('').then(() => {
                    Post.parse.should.have.been.calledWith(expected);
                });
            });
            it('should resolve to results of Post.parse()', () => {
                const expected = Math.random();
                Post.parse.resolves(expected);
                return post.edit('').should.become(expected);
            });
            it('should append reason to post when provided', () => {
                const text = 'text text text';
                const reason = 'rasin rasin';
                const expected = 'text text text\n\n###### rasin rasin';
                return post.edit(text, reason).then(() => {
                    forum._emitWithRetry.firstCall.args[2].content.should.equal(expected);
                });
            });
        });
        describe('append()', () => {
            let post = null,
                data = null,
                sandbox = null;
            beforeEach(() => {
                sandbox = sinon.sandbox.create();
                sandbox.stub(Post, 'parse').resolves();
                post = new Post({});
                data = utils.mapGet(post);
                forum._emit = sinon.stub().resolves({});
            });
            afterEach(() => sandbox.restore());
            it('should emit `plugins.composer.push` to retrieve post values', () => {
                data.id = Math.random();
                return post.append('').then(() => {
                    forum._emit.should.have.been.calledWith('plugins.composer.push', data.id);
                });
            });
            it('should emit `posts.edit` to edit post', () => {
                data.id = Math.random();
                return post.append('').then(() => {
                    forum._emitWithRetry.should.have.been.calledWith(10000, 'posts.edit');
                });
            });
            it('should combine data from composer to pass to `posts.edit`', () => {
                const id = Math.random();
                const tags = Math.random();
                const title = Math.random();
                const content = Math.random();
                data.id = Math.random();
                forum._emit.resolves({
                    pid: id,
                    tags: tags,
                    title: title,
                    body: ''
                });
                return post.append(content).then(() => {
                    forum._emitWithRetry.calledWith(10000, 'posts.edit', {
                        pid: id,
                        tags: tags,
                        title: title,
                        content: `\n\n---\n\n${content}`
                    }).should.be.true;
                });
            });
            it('should reject if `plugins.composer.push` rejects', () => {
                forum._emit.rejects('bad');
                return post.append('').should.be.rejected;
            });
            it('should reject if `posts.edit` rejects', () => {
                forum._emitWithRetry.rejects('bad');
                return post.append('').should.be.rejected;
            });
            it('should parse edit results via Post.parse()', () => {
                const expected = Math.random();
                forum._emitWithRetry.resolves(expected);
                return post.append('').then(() => {
                    Post.parse.should.have.been.calledWith(expected);
                });
            });
            it('should resolve to results of Post.parse()', () => {
                const expected = Math.random();
                Post.parse.resolves(expected);
                return post.append('').should.become(expected);
            });
            it('should append content to existing post', () => {
                const existing = 'some text!';
                const text = 'text text text';
                const expected = 'some text!\n\n---\n\ntext text text';
                forum._emit.resolves({
                    body: existing
                });
                return post.append(text).then(() => {
                    forum._emitWithRetry.firstCall.args[2].content.should.equal(expected);
                });
            });
            it('should append reason to post when provided', () => {
                const existing = 'some text!';
                const text = 'text text text';
                const reason = 'rasin rasin';
                const expected = 'some text!\n\n---\n\ntext text text\n\n###### rasin rasin';
                forum._emit.resolves({
                    body: existing
                });
                return post.append(text, reason).then(() => {
                    forum._emitWithRetry.firstCall.args[2].content.should.equal(expected);
                });
            });
        });
        describe('post tools', () => {
            describe('delete()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.delete`', () => {
                    return post.delete().then(() => {
                        forum._emit.should.have.been.calledWith('posts.delete');
                    });
                });
                it('should pass postId and topicId to `posts.delete`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.delete().then(() => {
                        forum._emit.calledWith('posts.delete', {
                            pid: data.id,
                            tid: data.topicId
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.delete().should.become(post);
                });
                it('should reject when `posts.delete` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.delete().should.be.rejected;
                });
            });
            describe('undelete()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.restore`', () => {
                    return post.undelete().then(() => {
                        forum._emit.should.have.been.calledWith('posts.restore');
                    });
                });
                it('should pass postId and topicId to `posts.restore`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.undelete().then(() => {
                        forum._emit.calledWith('posts.restore', {
                            pid: data.id,
                            tid: data.topicId
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.undelete().should.become(post);
                });
                it('should reject when `posts.delete` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.undelete().should.be.rejected;
                });
            });
            describe('upvote()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.upvote`', () => {
                    return post.upvote().then(() => {
                        forum._emit.should.have.been.calledWith('posts.upvote');
                    });
                });
                it('should pass postId and topicId to `posts.upvote`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.upvote().then(() => {
                        forum._emit.calledWith('posts.upvote', {
                            pid: data.id,
                            'room_id': `topic_${data.topicId}`
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.upvote().should.become(post);
                });
                it('should reject when `posts.upvote` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.upvote().should.be.rejected;
                });
            });
            describe('downvote()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.downvote`', () => {
                    return post.downvote().then(() => {
                        forum._emit.should.have.been.calledWith('posts.downvote');
                    });
                });
                it('should pass postId and topicId to `posts.downvote`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.downvote().then(() => {
                        forum._emit.calledWith('posts.downvote', {
                            pid: data.id,
                            'room_id': `topic_${data.topicId}`
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.downvote().should.become(post);
                });
                it('should reject when `posts.downvote` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.downvote().should.be.rejected;
                });
            });
            describe('unvote()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.unvote`', () => {
                    return post.unvote().then(() => {
                        forum._emit.should.have.been.calledWith('posts.unvote');
                    });
                });
                it('should pass postId and topicId to `posts.unvote`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.unvote().then(() => {
                        forum._emit.calledWith('posts.unvote', {
                            pid: data.id,
                            'room_id': `topic_${data.topicId}`
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.unvote().should.become(post);
                });
                it('should reject when `posts.unvote` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.unvote().should.be.rejected;
                });
            });
            describe('bookmark()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.favorite`', () => {
                    return post.bookmark().then(() => {
                        forum._emit.should.have.been.calledWith('posts.favorite');
                    });
                });
                it('should pass postId and topicId to `posts.favorite`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.bookmark().then(() => {
                        forum._emit.calledWith('posts.favorite', {
                            pid: data.id,
                            'room_id': `topic_${data.topicId}`
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.bookmark().should.become(post);
                });
                it('should reject when `posts.bookmark` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.bookmark().should.be.rejected;
                });
            });
            describe('unbookmark()', () => {
                let post = null,
                    data = null;
                beforeEach(() => {
                    post = new Post({});
                    data = utils.mapGet(post);
                    forum._emit = sinon.stub().resolves({});
                });
                it('should emit `posts.unfavorite`', () => {
                    return post.unbookmark().then(() => {
                        forum._emit.should.have.been.calledWith('posts.unfavorite');
                    });
                });
                it('should pass postId and topicId to `posts.unfavorite`', () => {
                    data.id = Math.random();
                    data.topicId = Math.random();
                    return post.unbookmark().then(() => {
                        forum._emit.calledWith('posts.unfavorite', {
                            pid: data.id,
                            'room_id': `topic_${data.topicId}`
                        }).should.be.true;
                    });
                });
                it('should resolve to self', () => {
                    return post.unbookmark().should.become(post);
                });
                it('should reject when `posts.unbookmark` rejects', () => {
                    forum._emit.rejects('bad');
                    return post.unbookmark().should.be.rejected;
                });
            });
        });
        describe('functions', () => {
            describe('reply()', () => {
                let sandbox = null;
                beforeEach(() => {
                    sandbox = sinon.sandbox.create();
                    sandbox.stub(Post, 'parse').resolves();
                });
                afterEach(() => sandbox.restore());
                it('should emit with retry', () => {
                    const id = Math.random();
                    const topicId = Math.random();
                    const content = `a${Math.random()}b`;
                    return Post.reply(topicId, id, content).then(() => {
                        forum._emitWithRetry.calledWith(10000, 'posts.reply', {
                            tid: topicId,
                            content: content,
                            toPid: id,
                            lock: false
                        }).should.be.true;
                    });
                });
                it('should parse result of websocket call', () => {
                    const expected = Math.random();
                    forum._emitWithRetry.resolves(expected);
                    return Post.reply(1, 2, 3).then(() => {
                        Post.parse.calledWith(expected);
                    });
                });
                it('should resolve to result of Post.parse', () => {
                    const expected = Math.random();
                    Post.parse.resolves(expected);
                    return Post.reply(1, 2, 3).should.become(expected);
                });
            });
            describe('get()', () => {
                it('should load via function `posts.getPost`', () => {
                    const expected = Math.random();
                    return Post.get(expected).then(() => {
                        forum.fetchObject.should.have.been.calledWith('posts.getPost', expected, Post.parse);
                    });
                });
                it('should resolve to result of forum.fetchObject()', () => {
                    const expected = Math.random();
                    forum.fetchObject.resolves(expected);
                    return Post.get(5).should.become(expected);
                });
                it('should reject when websocket rejects', () => {
                    forum.fetchObject.rejects('bad');
                    return Post.get(5).should.be.rejected;
                });
            });
            describe('preview()', () => {
                beforeEach(() => {
                    forum._emit = sinon.stub().resolves();
                });
                it('should emit `plugins.composer.renderPreview`', () => {
                    return Post.preview('').then(() => {
                        forum._emit.should.have.been.calledWith('plugins.composer.renderPreview');
                    });
                });
                it('should pass content `plugins.composer.renderPreview`', () => {
                    const content = `a${Math.random()}b`;
                    return Post.preview(content).then(() => {
                        forum._emit.should.have.been.calledWith('plugins.composer.renderPreview', content);
                    });
                });
                it('should resolve to results of `plugins.composer.renderPreview`', () => {
                    const content = `a${Math.random()}b`;
                    forum._emit.resolves(content);
                    return Post.preview('').should.become(content);
                });
                it('should reject when `plugins.composer.renderPreview` rejects', () => {
                    forum._emit.rejects('bad');
                    return Post.preview('').should.be.rejected;
                });
            });
            describe('parse()', () => {
                it('should throw error on falsy payload', () => {
                    chai.expect(() => Post.parse()).to.throw('E_POST_NOT_FOUND');
                });
                it('should store instance data in utils.storage', () => {
                    const post = Post.parse({});
                    utils.mapGet(post).should.be.ok;
                });
                it('should accept serialized input', () => {
                    const post = Post.parse('{}');
                    utils.mapGet(post).should.be.ok;
                });
                [
                    ['authorId', 'uid'],
                    ['content', 'content'],
                    ['id', 'pid'],
                    ['topicId', 'tid']
                ].forEach((keys) => {
                    const outKey = keys[0],
                        inKey = keys[1];
                    it(`should store ${outKey} in utils.storage`, () => {
                        const expected = `a${Math.random()}b`;
                        const values = {};
                        values[inKey] = expected;
                        const post = Post.parse(values);
                        utils.mapGet(post, outKey).should.equal(expected);
                    });
                });
                it('should parse timestamp for posted', () => {
                    const expected = Math.round(Math.random() * (2 << 29));
                    const user = Post.parse({
                        timestamp: expected
                    });
                    utils.mapGet(user, 'posted').getTime().should.equal(expected);
                });
            });
        });
    });
});
