import { ENVIRONMENT, BASE_URL } from 'src/networking';
import { restClient } from './restClient';
import FormData from 'form-data';
import { Duplex, Readable } from 'stream';
import { AxiosError } from 'axios';
import fs, { ReadStream } from 'fs';
import string2fileStream from 'string-to-file-stream';
export enum ENDPOINTS {
  SEED = 'Autenticacion/api/Autenticacion/Semilla',
  VALIDATE_SEED = 'Autenticacion/api/Autenticacion/ValidarSemilla',
}

export interface AuthToken {
  token: string;
  expira: string;
  expedido: string;
}
class ReadableString extends Readable {
  private sent = false;

  constructor(private str: string) {
    super();
  }

  _read() {
    if (!this.sent) {
      this.push(Buffer.from(this.str));
      this.sent = true;
    } else {
      this.push(null);
    }
  }
}

class RestApi {
  private env: ENVIRONMENT = ENVIRONMENT.DEV;

  constructor(env: ENVIRONMENT) {
    this.env = env;
  }

  private get baseApi() {
    return `/${this.env}`;
  }

  private getResource(endpoint: ENDPOINTS) {
    return `${this.baseApi}/${endpoint}`;
  }

  /**
   * Get an initial XML payload called seed, should be signed using the certificate .p12
   * @returns
   */
  getSeedApi = async (): Promise<string | undefined> => {
    try {
      const resource = this.getResource(ENDPOINTS.SEED);
      const response = await restClient.get(resource);

      if (response.status === 200) {
        return response.data;
      }
    } catch (err) {
      throw new Error(`${err}`);
    }
  };
  /**
   * Return the token from a signed seed
   * @param signedSeed the seed should be signed in order to get the token
   * @returns promise with the access token
   */

  getAuthTokenApi = async (
    signedSeed: string
  ): Promise<AuthToken | undefined> => {
    try {
      const resource = this.getResource(ENDPOINTS.VALIDATE_SEED);

      //Stream Readable
      const stream = string2fileStream(signedSeed, { path: 'signed.xml' });

      const formData = new FormData();
      formData.append('xml', stream);

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
          ...formData.getHeaders(),
        },
      };

      const response = await restClient.postForm(resource, formData, config);

      if (response.status === 200) {
        return response.data as AuthToken;
      }
    } catch (err) {
      const error = err as AxiosError;
      console.log('err', error.response?.data);
      throw new Error(`${err}`);
    }
  };
}

export default RestApi;
