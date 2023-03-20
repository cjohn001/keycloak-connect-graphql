import {CONTEXT_KEY, isAuthorizedByRole} from '../src';
import Keycloak from 'keycloak-connect';
import {KeycloakContextBase} from '../src';

console.error = jest.fn();

test('isAuthorizedByRole returns the result of token.hasRole', () => {
    const token = {
        hasRole: jest.fn((role: string) => {
            return role === 'c';
        }),
        isExpired: () => {
            return false;
        }
    } as unknown as Keycloak.Token;

    const context = {[CONTEXT_KEY]: new KeycloakContextBase(token)};
    expect(isAuthorizedByRole(['a', 'b', 'c'], context)).toBeTruthy();
    expect(token.hasRole).toHaveBeenCalledTimes(3);
});

test('isAuthorizedByRole returns false if hasRole returns false', () => {
    const token = {
        hasRole: jest.fn((_role: string) => {
            return false;
        }),
        isExpired: () => {
            return false;
        }
    } as unknown as Keycloak.Token;

    const context = {[CONTEXT_KEY]: new KeycloakContextBase(token)};
    expect(isAuthorizedByRole(['a', 'b', 'c'], context)).toBeFalsy();
});

test('isAuthorizedByRole returns false if context is empty', () => {
    const context = {};
    expect(isAuthorizedByRole(['a', 'b', 'c'], context)).toBeFalsy();
});

test('isAuthorizedByRole returns false if context undefined', () => {
    expect(isAuthorizedByRole(['a', 'b', 'c'], undefined)).toBeFalsy();
});
