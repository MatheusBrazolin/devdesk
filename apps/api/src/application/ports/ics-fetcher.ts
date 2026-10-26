/** Busca o texto de uma agenda .ics. A URL já chega validada. */
export interface IcsFetcher {
  fetch(url: URL): Promise<string>
}
