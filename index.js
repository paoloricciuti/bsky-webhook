import process from 'node:process';

const DID = process.env.DID;
const WANTED_COLLECTIONS = Object.fromEntries(
	process.env.WANTED_COLLECTIONS?.split(',').map((collection) => {
		const [name, ...url] = collection.split(':');
		return [name, url.join(':')];
	}) || [],
);

if (Object.keys(WANTED_COLLECTIONS).length === 0) {
	console.error('No wanted collections specified in .env');
	process.exit(1);
}

if (!DID) {
	console.error('No DID specified in .env');
	process.exit(1);
}

const url = new URL(
	`wss://jetstream1.us-west.bsky.network/subscribe?wantedDids=${DID}`,
);

for (let collection of Object.keys(WANTED_COLLECTIONS)) {
	url.searchParams.append('wantedCollections', collection);
}

const ws = new WebSocket(url);

ws.addEventListener('open', () => {
	console.log('Jetstream connected');
});

ws.addEventListener('message', (event) => {
	const data = JSON.parse(event.data);
	if (data?.kind === 'commit') {
		const collection = data?.commit?.collection;
		const url = WANTED_COLLECTIONS[collection];
		if (url) {
			fetch(url, {
				method: 'POST',
				body: JSON.stringify(data.commit),
			});
		}
	}
});

ws.addEventListener('error', (event) => {
	console.error('Jetstream WebSocket error', event);
});

ws.addEventListener('close', (event) => {
	console.error('Jetstream closed', {
		code: event.code,
		reason: event.reason,
		clean: event.wasClean,
	});
});
