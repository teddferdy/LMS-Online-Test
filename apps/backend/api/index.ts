import { createNestApp } from '../src/main'

let instancePromise: Promise<any> | null = null

function getExpressInstance() {
  if (!instancePromise) {
    instancePromise = createNestApp().then((app: any) =>
      app.getHttpAdapter().getInstance(),
    )
  }
  return instancePromise
}

export default async function handler(req: any, res: any) {
  const instance = await getExpressInstance()
  return instance(req, res)
}
