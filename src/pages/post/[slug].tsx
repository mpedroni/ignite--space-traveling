import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  function calcPostReadingTime(): number {
    const wordsHumanReadPerMinute = 200;
    const getWordsFromString = /[\wá-úÁ-Ú]+/g;

    const countWords = (str: string): number => {
      return str.match(getWordsFromString)?.length || 0;
    };

    const postTotalWords = post.data.content.reduce(
      (contentWordsLength, { heading, body }) => {
        const headingWordsLength = countWords(heading);

        const bodyWordsLength = body.reduce((acc, { text }) => {
          const textWordsLength = countWords(text);

          return acc + textWordsLength;
        }, 0);

        return contentWordsLength + headingWordsLength + bodyWordsLength;
      },
      0
    );

    const postReadingTime = Math.ceil(postTotalWords / wordsHumanReadPerMinute);

    return postReadingTime;
  }

  const readingTime = `${calcPostReadingTime()} min`;

  return (
    <>
      <Header />

      {isFallback ? (
        <div className={`${commonStyles.container} ${styles.loadingMessage}`}>
          <h1>Carregando...</h1>
        </div>
      ) : (
        <>
          <img
            src={post.data.banner.url}
            alt="banner"
            className={styles.banner}
            key={`${post.data.title}_img`}
          />

          <section
            className={commonStyles.container}
            key={`${post.data.title}_section`}
          >
            <main className={styles.content}>
              <h1>{post.data.title}</h1>

              <div className={styles.info}>
                <span>
                  <FiCalendar />{' '}
                  {format(
                    new Date(post.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </span>
                <span>
                  <FiUser /> {post.data.author}
                </span>
                <span>
                  <FiClock /> {readingTime}
                </span>
              </div>

              {post.data.content.map(({ heading, body }) => (
                <div key={heading}>
                  <h2>{heading}</h2>

                  {body.map(({ text }) => (
                    <p key={`${text}_${heading}`}>{text}</p>
                  ))}
                </div>
              ))}
            </main>
          </section>
        </>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'posts')
  );

  return {
    paths: posts.results.map(post => ({ params: { slug: post.uid } })),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();

  const response = await prismic.getByUID(
    'posts',
    String(context.params.slug),
    {}
  );

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content,
      title: response.data.title,
      subtitle: response.data.subtitle,
    },
  };

  return {
    props: { post },
  };
};
