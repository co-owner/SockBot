'use strict';

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
require('sinon-as-promised');

const testModule = require('../../plugins/echo');

describe('plugins/echo', () => {
    describe('module', () => {
        it('should export plugin function', () => {
            testModule.plugin.should.be.a('function');
        });
        it('should return an object', () => {
            testModule.plugin().should.be.an('object');
        });
        it('should return an object with an activate function', () => {
            testModule.plugin().activate.should.be.a('function');
        });
        it('should return an object with a deactivate function', () => {
            testModule.plugin().deactivate.should.be.a('function');
        });
        it('should return an object with an _echo function', () => {
            testModule.plugin()._echo.should.be.a('function');
        });
    });
    describe('plugin', () => {
        let plugin = null,
            forum = null,
            command = null;
        beforeEach(() => {
            forum = {
                Commands: {
                    add: sinon.stub().resolves()
                }
            };
            plugin = testModule.plugin(forum);
            command = {
                getPost: sinon.stub().resolves({}),
                getUser: sinon.stub().resolves({}),
                reply: sinon.stub()
            };
        });
        it('should register command on activate', () => {
            return plugin.activate().then(() => {
                forum.Commands.add.calledWith('echo', 'Simple testing command', plugin._echo).should.be.true;
            });
        });
        it('should reject activation when Commands.add rejects', () => {
            forum.Commands.add.rejects('bad');
            return plugin.activate().should.be.rejected;
        });
        it('should noop on deactivate', () => {
            return plugin.deactivate();
        });
        describe('echo()', () => {
            it('should retrieve post data', () => {
                return plugin._echo(command).then(() => {
                    command.getPost.called.should.be.true;
                });
            });
            it('should retrieve user data', () => {
                return plugin._echo(command).then(() => {
                    command.getUser.called.should.be.true;
                });
            });
            it('should reply with expected text', () => {
                command.getPost.resolves({
                    content: 'I am a teapot, short and stout.'
                });
                command.getUser.resolves({
                    username: 'Testy_McTesterson'
                });
                return plugin._echo(command).then(() => {
                    command.reply.calledWith('@Testy_McTesterson said:\n' +
                        '> I am a teapot, short and stout.').should.be.true;
                });
            });
        });
    });
});