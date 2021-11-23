import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { useRouter } from 'next/router';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
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
          <h1>Loading...</h1>
        </div>
      ) : (
        <>
          <img
            src={post.data.banner.url}
            alt="banner"
            className={styles.banner}
          />

          <section className={commonStyles.container}>
            <main className={styles.content}>
              <h1>{post.data.title}</h1>

              <div className={styles.info}>
                <span>
                  <FiCalendar /> {post.first_publication_date}
                </span>
                <span>
                  <FiUser /> {post.data.author}
                </span>
                <span>
                  <FiClock /> {readingTime}
                </span>
              </div>

              {post.data.content.map(({ heading, body }) => (
                <>
                  <h2>{heading}</h2>

                  {body.map(({ text }) => (
                    <p>{text}</p>
                  ))}
                </>
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

  const post = posts.results[0];

  return {
    paths: [{ params: { slug: post.uid } }],
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
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    data: {
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content,
      title: response.data.title,
    },
  };

  console.log(post);

  return {
    props: { post },
  };
};
