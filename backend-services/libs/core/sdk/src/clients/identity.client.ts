import axios from 'axios';

export class IdentityClient {
    constructor(private readonly baseUrl: string) {}

    /**
     * Validates an access token by forwarding it to identity-service as the
     * `access_token` cookie — matching identity's cookie-first JwtStrategy.
     * Used by RemoteAuthGuard (HTTP) and the Socket.io gateway (WS handshake).
     */
    async validate(accessToken: string): Promise<{ userId: string; email: string }> {
        const res = await axios.get<{ userId: string; email: string }>(`${this.baseUrl}/api/v1/auth/validate`, {
            headers: { Cookie: `access_token=${accessToken}` },
        });
        return res.data;
    }
}
