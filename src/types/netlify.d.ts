declare module '@netlify/functions' {
  export interface Context {
    clientContext: { [key: string]: any };
    callbackWaitsForEmptyEventLoop: boolean;
  }

  export interface Event {
    rawUrl: string;
    rawQuery: string;
    path: string;
    httpMethod: string;
    headers: { [key: string]: string };
    multiValueHeaders: { [key: string]: string[] };
    queryStringParameters: { [key: string]: string } | null;
    multiValueQueryStringParameters: { [key: string]: string[] } | null;
    body: string | null;
    isBase64Encoded: boolean;
  }

  export type Handler = (
    event: Event,
    context: Context
  ) => Promise<{
    statusCode: number;
    body: string;
    headers?: { [key: string]: string };
  }>;
} 