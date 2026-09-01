import Link from 'next/link';

export default function Footer() {
  return (
    // mt-auto, not a fixed margin: in the flex column every page uses, this
    // pins the footer to the bottom when content is short and collapses to
    // nothing when content already fills the page. A fixed margin instead added
    // height past the viewport, which is what pushed it below the fold.
    <footer className={'text-[10px] text-center w-full mt-auto px-2 pb-2 pt-12 text-black'}>
      <p>
        @ 2026 Papermind - Made by Alan GEIRNAERT -{' '}
        <Link href={'https://github.com/alangnt'} className={'underline'} target={'_blank'}>
          GitHub
        </Link>{' '}
        -{' '}
        <Link
          href={'https://www.linkedin.com/in/alan-geirnaert/'}
          className={'underline'}
          target={'_blank'}
        >
          LinkedIn
        </Link>{' '}
        - Powered by{' '}
        <Link href={'https://arxiv.org/'} className={'underline'} target={'_blank'}>
          arXiv&apos;s API
        </Link>
      </p>
    </footer>
  );
}
