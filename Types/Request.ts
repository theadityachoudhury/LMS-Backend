import { resUser } from "./User";

export interface token {
    accessToken: string;
    refreshToken: string;
    expiresIn: Date;
}

export interface customRequest extends Request {
    user: resUser;
    token: token;
    device: DeviceInfo;
}

interface DeviceInfo {
    type: string;
    name: string;
}
