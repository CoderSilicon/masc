<script lang="ts">
	import favicon from '$lib/assets/favicon.ico';
	import "../app.css";
	import "$lib/styles/font.scss";

	import { onMount } from 'svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { session } from '../session';

	let { children } = $props();

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				session.set({
					user: {
						uid: user.uid,
						email: user.email,
						displayName: user.displayName,
						photoURL: user.photoURL
					},
					loading: false,
					loggedIn: true
				});
			} else {
				session.set({
					user: null,
					loading: false,
					loggedIn: false
				});
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>masc</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
