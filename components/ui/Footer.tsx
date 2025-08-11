import Link from 'next/link';

export default function Footer() {
	return (
		<footer className={'text-[10px] text-center w-full mt-12 p-2 text-black'}>
			<p>@ 2025 Papermind - Made by Alan GEIRNAERT - <Link href={'https://github.com/alangnt'} className={'underline'} target={'_blank'}>GitHub</Link> - <Link href={'https://www.linkedin.com/in/alan-geirnaert/'} className={'underline'} target={'_blank'}>LinkedIn</Link></p>
		</footer>
	)
}
