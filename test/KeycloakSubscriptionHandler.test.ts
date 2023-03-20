import Keycloak from '../src/KeycloakTypings';
import { KeycloakSubscriptionHandler } from '../src';
import { Token } from './utils/KeycloakToken';

const TEST_CLIENT_ID = 'voyager-testing';

test('onSubscriptionConnect throws if no keycloak provided',   () => {
    // @ts-ignore
    expect(() => new KeycloakSubscriptionHandler()).toThrow(/missing keycloak instance in options/i);
});

test('onSubscriptionConnect throws if no connectionParams Provided', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });

    await expect(
        subscriptionHandler.onSubscriptionConnect(null, {}, {})
    ).rejects.toThrow(/Access Denied - missing connection parameters for Authentication/);
});

test('onSubscriptionConnect throws if no connectionParams is not an object', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = 'not an object';

    await expect(
        subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {})
    ).rejects.toThrow(/Access Denied - missing connection parameters for Authentication/);
});

test('onSubscriptionConnect throws if no Auth provided', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = { Authorization: undefined };

    await expect(
        subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {})
    ).rejects.toThrow(/Access Denied - missing Authorization field in connection parameters/);
});

test('onSubscriptionConnect throws if "Authorization" field is not formed correctly', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = { Authorization: '1234' };

    await expect(
        subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {})
    ).rejects.toThrow(/Access Denied - Error: Invalid Authorization field in connection params. Must be in the format "Authorization": "Bearer <token string>"/);
});

test('onSubscriptionConnect returns a token Object if the keycloak library considers it valid', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (tk: any) => {
                return { access_token: new Token(tk.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const tokenString = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfa29BTUtBcW1xQjcxazNGeDdBQ0xvNXZqMXNoWVZwSkdJM2FScFl4allZIn0.eyJqdGkiOiJjN2UyMzA0NS00NGVmLTQ1ZDItOGY0Yy1jODA4OTlhYzljYzIiLCJleHAiOjE1NTc5NjcxMjQsIm5iZiI6MCwiaWF0IjoxNTU3OTMxMTI0LCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvdm95YWdlci10ZXN0aW5nIiwiYXVkIjoidm95YWdlci10ZXN0aW5nIiwic3ViIjoiM2Y4MDRiNWEtM2U3Ni00YzI2LTk4ZTYtNDU1ZDNlMzUzZmY3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidm95YWdlci10ZXN0aW5nIiwiYXV0aF90aW1lIjoxNTU3OTMxMTI0LCJzZXNzaW9uX3N0YXRlIjoiOThiNTM2ODAtODU5MC00MzFmLWFiNzctMDY0MDFmODgzYTY5IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInByZWZlcnJlZF91c2VybmFtZSI6ImRldmVsb3BlciJ9.iF3WdY6hwlZIX2bq40fs0GhxG991TqtBEuKbX7A8DMfgOj2QFDyNHGLVzEiJqMal44pmhlWhtOSoVp77ZZ57HdatEYqYaTnc8C8ajA8A1yxOX81D0lFu2jmC3WpKS2H0prrjdPPZyf82YpbYuwYAyiKJMpJSiRC2fGk1Owsg9O6CSj8cFbKfrS4msE1Y90S84qwrDfRYFSFFdsmeTvC71qyj4ZhNqNfPWbIwymlnYJ6xYbmTrZBv2GktXBLd0BnSu5QFoHgjiCxG3cyFV4tCIBpvWjebI6rCUehD6TTIXiW4uVOp9YPWvyZH8WznFdtq36CDb51abWJ8EUquog7M1w';
    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = { Authorization: tokenString };

    const token = await subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {}) as any;
    expect(token).toBeTruthy();
    expect(token?.content).toBeTruthy();
});

test('onSubscriptionConnect can also parse the token with lowercase "bearer"', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (tk: any) => {
                return { access_token: new Token(tk.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const tokenString = 'bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfa29BTUtBcW1xQjcxazNGeDdBQ0xvNXZqMXNoWVZwSkdJM2FScFl4allZIn0.eyJqdGkiOiJjN2UyMzA0NS00NGVmLTQ1ZDItOGY0Yy1jODA4OTlhYzljYzIiLCJleHAiOjE1NTc5NjcxMjQsIm5iZiI6MCwiaWF0IjoxNTU3OTMxMTI0LCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvdm95YWdlci10ZXN0aW5nIiwiYXVkIjoidm95YWdlci10ZXN0aW5nIiwic3ViIjoiM2Y4MDRiNWEtM2U3Ni00YzI2LTk4ZTYtNDU1ZDNlMzUzZmY3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidm95YWdlci10ZXN0aW5nIiwiYXV0aF90aW1lIjoxNTU3OTMxMTI0LCJzZXNzaW9uX3N0YXRlIjoiOThiNTM2ODAtODU5MC00MzFmLWFiNzctMDY0MDFmODgzYTY5IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInByZWZlcnJlZF91c2VybmFtZSI6ImRldmVsb3BlciJ9.iF3WdY6hwlZIX2bq40fs0GhxG991TqtBEuKbX7A8DMfgOj2QFDyNHGLVzEiJqMal44pmhlWhtOSoVp77ZZ57HdatEYqYaTnc8C8ajA8A1yxOX81D0lFu2jmC3WpKS2H0prrjdPPZyf82YpbYuwYAyiKJMpJSiRC2fGk1Owsg9O6CSj8cFbKfrS4msE1Y90S84qwrDfRYFSFFdsmeTvC71qyj4ZhNqNfPWbIwymlnYJ6xYbmTrZBv2GktXBLd0BnSu5QFoHgjiCxG3cyFV4tCIBpvWjebI6rCUehD6TTIXiW4uVOp9YPWvyZH8WznFdtq36CDb51abWJ8EUquog7M1w';
    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = { Authorization: tokenString };
    const token = await subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {}) as any;
    expect(token).toBeTruthy();
    expect(token?.content).toBeTruthy();
});

test('the token object will have hasRole function if grant is successfully created', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (tk: any) => {
                return { access_token: new Token(tk.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    // hardcoded token object that can be used for quick unit testing
    // works with a clientId called 'voyager-testing' and has a client role 'tester'
    const tokenString = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfa29BTUtBcW1xQjcxazNGeDdBQ0xvNXZqMXNoWVZwSkdJM2FScFl4allZIn0.eyJqdGkiOiJmMWZjZDdmNS1mMWM0LTQyYWQtYjFmOC00ZWVhNzNiZWU2N2MiLCJleHAiOjE1NTc5Njc4MzksIm5iZiI6MCwiaWF0IjoxNTU3OTMxODM5LCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvdm95YWdlci10ZXN0aW5nIiwiYXVkIjoidm95YWdlci10ZXN0aW5nIiwic3ViIjoiM2Y4MDRiNWEtM2U3Ni00YzI2LTk4ZTYtNDU1ZDNlMzUzZmY3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidm95YWdlci10ZXN0aW5nIiwiYXV0aF90aW1lIjoxNTU3OTMxODM5LCJzZXNzaW9uX3N0YXRlIjoiMDQ2YTk4N2QtNmI4NS00Njk5LTllNmUtNGIyYmVlYzBhYzNhIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7InZveWFnZXItdGVzdGluZyI6eyJyb2xlcyI6WyJ0ZXN0ZXIiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInByZWZlcnJlZF91c2VybmFtZSI6ImRldmVsb3BlciJ9.YjmImGZbs5-s0K1KEYnIedW3peIUz4rORoOUTNFgE2sEKHe2hvvDg48NNybVsJDZc29Al-6OiUw8En5GpschqHHb79GqStEtuJ5T2UZb5sC2B7sX1jAvZAafkxCcOMajEbgS5qVPGoFhDTTej06sGfQwI8h0Igwle86O8IDMbEK-uN_oVa1xKTrFtvsFKekS3Yz3_qSVlmAhOKyYejEg8hkZOvJzHXK9_zsi3Ze6MLq2VCSJE-13UnZuSvdD36FydJQXkZ7elKYqj_HcyPIMAkBuKPhYAXZ9laMo2X4wM6gSIFZXKPeG44eUAGH7estqeG2oXNsdbPaixoNFHHuMqA';
    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = { Authorization: tokenString, clientId: 'voyager-testing' };
    const token = await subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {});
    expect(token?.hasRole('tester')).toBeTruthy();
});

test('If grant creation fails then onSubscriptionConnect will throw', async () => {
    const errorMsg = 'token is invalid';
    const stubKeycloak = {
        grantManager: {
            createGrant: (_token: any) => {
                return new Promise((resolve, reject) => {
                    reject(new Error(errorMsg));
                });
            }
        }
    } as unknown as Keycloak.Keycloak;

    // hardcoded token object that can be used for quick unit testing
    // works with a clientId called 'voyager-testing' and has a client role 'tester'
    const tokenString = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfa29BTUtBcW1xQjcxazNGeDdBQ0xvNXZqMXNoWVZwSkdJM2FScFl4allZIn0.eyJqdGkiOiJmMWZjZDdmNS1mMWM0LTQyYWQtYjFmOC00ZWVhNzNiZWU2N2MiLCJleHAiOjE1NTc5Njc4MzksIm5iZiI6MCwiaWF0IjoxNTU3OTMxODM5LCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvdm95YWdlci10ZXN0aW5nIiwiYXVkIjoidm95YWdlci10ZXN0aW5nIiwic3ViIjoiM2Y4MDRiNWEtM2U3Ni00YzI2LTk4ZTYtNDU1ZDNlMzUzZmY3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidm95YWdlci10ZXN0aW5nIiwiYXV0aF90aW1lIjoxNTU3OTMxODM5LCJzZXNzaW9uX3N0YXRlIjoiMDQ2YTk4N2QtNmI4NS00Njk5LTllNmUtNGIyYmVlYzBhYzNhIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7InZveWFnZXItdGVzdGluZyI6eyJyb2xlcyI6WyJ0ZXN0ZXIiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInByZWZlcnJlZF91c2VybmFtZSI6ImRldmVsb3BlciJ9.YjmImGZbs5-s0K1KEYnIedW3peIUz4rORoOUTNFgE2sEKHe2hvvDg48NNybVsJDZc29Al-6OiUw8En5GpschqHHb79GqStEtuJ5T2UZb5sC2B7sX1jAvZAafkxCcOMajEbgS5qVPGoFhDTTej06sGfQwI8h0Igwle86O8IDMbEK-uN_oVa1xKTrFtvsFKekS3Yz3_qSVlmAhOKyYejEg8hkZOvJzHXK9_zsi3Ze6MLq2VCSJE-13UnZuSvdD36FydJQXkZ7elKYqj_HcyPIMAkBuKPhYAXZ9laMo2X4wM6gSIFZXKPeG44eUAGH7estqeG2oXNsdbPaixoNFHHuMqA';
    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak });
    const connectionParams = { Authorization: tokenString, clientId: 'voyager-testing' };
    await expect(
        subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {})
    ).rejects.toThrow(`Access Denied - ${new Error(errorMsg)}`);
});

test('onSubscriptionConnect with {protect: false} does not throw if no connectionParams Provided', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak, protect: false });
    await expect(
        subscriptionHandler.onSubscriptionConnect(null, {}, {})
    ).resolves;
});

test('onSubscriptionConnect with {protect: false} does not throw if connectionParams is not an object', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak, protect: false });
    const connectionParams = 'not an object';
    await expect(
        subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {})
    ).resolves;
});

test('onSubscriptionConnect with {protect: false} does not throw if no Auth provided', async () => {
    const stubKeycloak = {
        grantManager: {
            createGrant: (token: any) => {
                return { access_token: new Token(token.access_token, TEST_CLIENT_ID)};
            }
        }
    } as unknown as Keycloak.Keycloak;

    const subscriptionHandler = new KeycloakSubscriptionHandler({ keycloak: stubKeycloak, protect: false });
    const connectionParams = { Authorization: undefined };
    await expect(
        subscriptionHandler.onSubscriptionConnect(connectionParams, {}, {})
    ).resolves;
});
