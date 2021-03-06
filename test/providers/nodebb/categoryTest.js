'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
chai.use(require('sinon-chai'));

const categoryModule = require('../../../providers/nodebb/category');
const utils = require('../../../lib/utils');

describe('providers/nodebb/categor', () => {
    it('should export bindCategory()', () => {
        categoryModule.bindCategory.should.be.a('function');
    });
    it('should return a class on call to bindCategory()', () => {
        categoryModule.bindCategory({}).should.be.a('function');
    });
    describe('Category', () => {
        const forum = {};
        const Category = categoryModule.bindCategory(forum);
        beforeEach(() => {
            forum._emit = sinon.stub().resolves();
            forum._emitWithRetry = sinon.stub().resolves();
            forum.Topic = {
                parse: sinon.stub().resolves()
            };
            forum.fetchObject = sinon.stub().resolves();
        });
        describe('ctor()', () => {
            it('should store instance data in utils.storage', () => {
                const category = new Category({});
                utils.mapGet(category).should.be.ok;
            });
            it('should accept serialized input', () => {
                const category = new Category('{}');
                utils.mapGet(category).should.be.ok;
            });
            [
                ['id', 'cid'],
                ['name', 'name'],
                ['description', 'description'],
                ['url', 'slug'],
                ['parentId', 'parentCid'],
                ['topicCount', 'topic_count'],
                ['postCount', 'post_count'],
                ['recentPosts', 'numRecentReplies']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const category = new Category(values);
                    utils.mapGet(category, outKey).should.equal(expected);
                });
            });
        });
        describe('simple getters', () => {
            let category, data;
            beforeEach(() => {
                category = new Category({});
                data = utils.mapGet(category);
            });
            ['id', 'name', 'description', 'parentId', 'topicCount',
                'postCount', 'recentPosts'
            ].forEach((key) => {
                it(`should get value from utils.storage for ${key}`, () => {
                    const expected = `${Math.random()}${Math.random()}`;
                    data[key] = expected;
                    category[key].should.equal(expected);
                });
            });
        });
        describe('url()', () => {
            let category, data;
            beforeEach(() => {
                category = new Category({});
                data = utils.mapGet(category);
            });
            it('should resolve to expected value', () => {
                const expected = 'theForum/category/theCategorySlug';
                forum.url = 'theForum';
                data.url = 'theCategorySlug';
                return category.url().should.become(expected);
            });
            it('should resolve to randomized expected value', () => {
                const partA = `a${Math.random()}b`,
                    partB = `c${Math.random()}d`,
                    expected = `${partA}/category/${partB}`;
                forum.url = partA;
                data.url = partB;
                return category.url().should.become(expected);
            });
        });

        describe('addTopic()', () => {
            let category, cid;
            beforeEach(() => {
                cid = Math.random();
                category = new Category({
                    cid: cid
                });
            });
            it('should emit `topics.post`', () => {
                return category.addTopic('title', 'body').then(() => {
                    forum._emitWithRetry.should.have.been.calledWith(10000, 'topics.post');
                });
            });
            it('should emit expected body', () => {
                return category.addTopic('title', 'body').then(() => {
                    const body = forum._emitWithRetry.firstCall.args[2];
                    body.should.eql({
                        cid: cid,
                        title: 'title',
                        content: 'body',
                        tags: [],
                        thumb: ''
                    });
                });
            });
        });
        describe('getAllTopics()', () => {
            let category, data, spy;
            beforeEach(() => {
                category = new Category({});
                data = utils.mapGet(category);
                spy = sinon.stub().resolves();
                forum._emit.resolves({});
                forum.Topic = {
                    parseExtended: sinon.stub().resolves([])
                };
            });
            it('should load topics via websocket `categories.loadMore`', () => {
                const expected = Math.random();
                data.id = expected;
                return category.getAllTopics(spy).then(() => {
                    forum._emit.calledWith('categories.loadMore', {
                        cid: expected,
                        after: 0,
                        direction: 1
                    }).should.be.true;
                });
            });
            it('should additional topics via websocket `categories.loadMore`', () => {
                data.id = Math.random();
                const expected = Math.random();
                forum._emit.onFirstCall().resolves({
                    topics: [1],
                    nextStart: expected
                });
                return category.getAllTopics(spy).then(() => {
                    forum._emit.calledWith('categories.loadMore', {
                        cid: data.id,
                        after: expected,
                        direction: 1
                    }).should.be.true;
                });
            });
            it('should not call progress fn with no results', () => {
                return category.getAllTopics(spy).then(() => {
                    spy.should.not.have.been.called;
                });
            });
            it('should not call progress fn with empty results', () => {
                forum._emit.resolves({
                    topics: []
                });
                return category.getAllTopics(spy).then(() => {
                    spy.should.not.have.been.called;
                });
            });
            it('should call progress fn for each loaded topic', () => {
                forum._emit.onFirstCall().resolves({
                    topics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });
                return category.getAllTopics(spy).then(() => {
                    spy.callCount.should.equal(10);
                });
            });
            it('should parse topic with `forum.Topic.parse`', () => {
                const expected = Math.random();
                forum._emit.onFirstCall().resolves({
                    topics: [expected]
                });
                return category.getAllTopics(spy).then(() => {
                    forum.Topic.parseExtended.should.have.been.calledWith(expected);
                });
            });
            it('should pass expected values to progress fn', () => {
                forum._emit.onFirstCall().resolves({
                    topics: [1]
                });
                const topic = Math.random();
                const categoryval = Math.random();
                const user = Math.random();
                forum.Topic.parseExtended.resolves({
                    topic: topic,
                    user: user,
                    category: categoryval
                });

                return category.getAllTopics(spy).then(() => {
                    spy.should.have.been.calledWith(topic, user, categoryval);
                });
            });
            describe('promise behavior', () => {
                it('should reject when websocket rejects', () => {
                    forum._emit.rejects('bad');
                    return category.getAllTopics(spy).should.be.rejected;
                });
                it('should reject when Topic.parse throws', () => {
                    forum._emit.onFirstCall().resolves({
                        topics: [1]
                    });
                    forum.Topic.parseExtended.rejects('bad');
                    return category.getAllTopics(spy).should.be.rejected;
                });
                it('should reject when progress fn rejects', () => {
                    forum._emit.onFirstCall().resolves({
                        topics: [1]
                    });
                    spy.rejects('bad');
                    return category.getAllTopics(spy).should.be.rejected;
                });
                it('should resolve to self', () => {
                    return category.getAllTopics(spy).should.become(category);
                });
            });
        });
        describe('getRecentTopics()', () => {
            let category, data, spy;
            beforeEach(() => {
                category = new Category({});
                data = utils.mapGet(category);
                spy = sinon.stub().resolves();
                forum._emit.resolves({});
                forum.Topic = {
                    parseExtended: sinon.stub().resolves([])
                };
            });
            it('should load topics via websocket `categories.loadMore`', () => {
                const expected = Math.random();
                data.id = expected;
                return category.getRecentTopics(spy).then(() => {
                    forum._emit.calledWith('categories.loadMore', {
                        cid: expected,
                        after: 0,
                        direction: 1
                    }).should.be.true;
                });
            });
            it('should not get additional topics via websocket `categories.loadMore`', () => {
                data.id = Math.random();
                const expected = Math.random();
                forum._emit.onFirstCall().resolves({
                    topics: [1],
                    nextStart: expected
                });
                return category.getRecentTopics(spy).then(() => {
                    forum._emit.calledWith('categories.loadMore', {
                        cid: data.id,
                        after: expected,
                        direction: 1
                    }).should.be.false;
                });
            });
            it('should not call progress fn with no results', () => {
                return category.getRecentTopics(spy).then(() => {
                    spy.should.not.have.been.called;
                });
            });
            it('should not call progress fn with empty results', () => {
                forum._emit.resolves({
                    topics: []
                });
                return category.getRecentTopics(spy).then(() => {
                    spy.should.not.have.been.called;
                });
            });
            it('should call progress fn for each loaded topic', () => {
                forum._emit.onFirstCall().resolves({
                    topics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });
                return category.getRecentTopics(spy).then(() => {
                    spy.callCount.should.equal(10);
                });
            });
            it('should parse topic with `forum.Topic.parseExtended`', () => {
                const expected = Math.random();
                forum._emit.onFirstCall().resolves({
                    topics: [expected]
                });
                return category.getRecentTopics(spy).then(() => {
                    forum.Topic.parseExtended.should.have.been.calledWith(expected);
                });
            });
            it('should pass expected values to progress fn', () => {
                forum._emit.onFirstCall().resolves({
                    topics: [1]
                });
                const topic = Math.random();
                const categoryval = Math.random();
                const user = Math.random();
                forum.Topic.parseExtended.resolves({
                    topic: topic,
                    user: user,
                    category: categoryval
                });
                return category.getRecentTopics(spy).then(() => {
                    spy.should.have.been.calledWith(topic, user, categoryval);
                });
            });
            describe('promise behavior', () => {
                it('should reject when websocket rejects', () => {
                    forum._emit.rejects('bad');
                    return category.getRecentTopics(spy).should.be.rejected;
                });
                it('should reject when Topic.parseExtended rejects', () => {
                    forum._emit.onFirstCall().resolves({
                        topics: [1]
                    });
                    forum.Topic.parseExtended.rejects('bad');
                    return category.getRecentTopics(spy).should.be.rejected;
                });
                it('should reject when progress fn rejects', () => {
                    forum._emit.onFirstCall().resolves({
                        topics: [1]
                    });
                    spy.rejects('bad');
                    return category.getRecentTopics(spy).should.be.rejected;
                });
                it('should resolve to self', () => {
                    return category.getRecentTopics(spy).should.become(category);
                });
            });
        });
        describe('watch()', () => {
            let category, data;
            beforeEach(() => {
                category = new Category({});
                data = utils.mapGet(category);
            });
            it('should emit `categories.watch`', () => {
                return category.watch().then(() => {
                    forum._emit.should.have.been.calledWith('categories.watch');
                });
            });
            it('should pass cid to `categories.watch`', () => {
                data.id = Math.random();
                return category.watch().then(() => {
                    forum._emit.calledWith('categories.watch', {
                        cid: data.id
                    }).should.be.true;
                });
            });
            it('should resolve to self', () => {
                return category.watch().should.become(category);
            });
            it('should reject when wqebsocket rejects', () => {
                forum._emit.rejects('bad');
                return category.watch().should.be.rejected;
            });
        });
        describe('unwatch()', () => {
            let category, data;
            beforeEach(() => {
                category = new Category({});
                data = utils.mapGet(category);
            });
            it('should emit `categories.ignore`', () => {
                return category.unwatch().then(() => {
                    forum._emit.should.have.been.calledWith('categories.ignore');
                });
            });
            it('should pass cid to `categories.ignore`', () => {
                data.id = Math.random();
                return category.unwatch().then(() => {
                    forum._emit.calledWith('categories.ignore', {
                        cid: data.id
                    }).should.be.true;
                });
            });
            it('should resolve to self', () => {
                return category.unwatch().should.become(category);
            });
            it('should reject when wqebsocket rejects', () => {
                forum._emit.rejects('bad');
                return category.unwatch().should.be.rejected;
            });
        });
        describe('mute() stubs', () => {
            let category;
            beforeEach(() => {
                category = new Category({});
            });
            it('should noop mute()', () => {
                return category.mute().should.become(category);
            });
            it('should noop unmute()', () => {
                return category.unmute().should.become(category);
            });
        });
        describe('static get()', () => {
            it('should load via function `categories.getCategory`', () => {
                const expected = Math.random();
                return Category.get(expected).then(() => {
                    forum.fetchObject.should.have.been
                        .calledWith('categories.getCategory', expected, Category.parse);
                });
            });
            it('should resolve to result of forum.fetchObject()', () => {
                const expected = Math.random();
                forum.fetchObject.resolves(expected);
                return Category.get(5).should.become(expected);
            });
            it('should reject when websocket rejects', () => {
                forum.fetchObject.rejects('bad');
                return Category.get(5).should.be.rejected;
            });
        });
        describe('static parse()', () => {
            it('should throw error on falsy payload', () => {
                chai.expect(() => Category.parse()).to.throw('E_CATEGORY_NOT_FOUND');
            });
            it('should store instance data in utils.storage', () => {
                const category = Category.parse({});
                utils.mapGet(category).should.be.ok;
            });
            it('should accept serialized input', () => {
                const category = Category.parse('{}');
                utils.mapGet(category).should.be.ok;
            });
            [
                ['id', 'cid'],
                ['name', 'name'],
                ['description', 'description'],
                ['url', 'slug'],
                ['parentId', 'parentCid'],
                ['topicCount', 'topic_count'],
                ['postCount', 'post_count'],
                ['recentPosts', 'numRecentReplies']
            ].forEach((keys) => {
                const outKey = keys[0],
                    inKey = keys[1];
                it(`should store ${outKey} in utils.storage`, () => {
                    const expected = `a${Math.random()}b`;
                    const values = {};
                    values[inKey] = expected;
                    const category = Category.parse(values);
                    utils.mapGet(category, outKey).should.equal(expected);
                });
            });
        });
    });
});
