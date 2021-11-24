import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiUser } from 'react-icons/fi';

import { useEffect, useState } from 'react';
import ApiSearchResponse from '@prismicio/client/types/ApiSearchResponse';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>([] as Post[]);
  const [nextPage, setNextPage] = useState<string>('');

  async function handleLoadMorePosts(): Promise<void> {
    if (!nextPage) return;

    const response = (await (
      await fetch(nextPage)
    ).json()) as ApiSearchResponse;

    const newPosts = response.results.map(post => ({
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }));

    setNextPage(response.next_page);
    setPosts([...posts, ...newPosts]);
  }

  useEffect(() => {
    setPosts(postsPagination.results);
    setNextPage(postsPagination.next_page);
  }, []);

  return (
    <>
      <Head>
        <title>Posts | SpaceTraveling</title>
      </Head>

      <section className={commonStyles.container}>
        <nav className={styles.navbar}>
          <img src="/logo.svg" alt="logo" />
        </nav>

        <main className={styles.posts}>
          {posts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <h2>{post.data.title}</h2>
                <h3>{post.data.subtitle}</h3>

                <div>
                  <span>
                    <FiCalendar />
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </span>
                  <span>
                    <FiUser />
                    {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          ))}

          {nextPage && (
            <button
              type="button"
              className={styles.loadMorePostsButton}
              onClick={handleLoadMorePosts}
            >
              Carregar mais posts
            </button>
          )}
        </main>
      </section>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
    }
  );

  const posts = postsResponse.results.map(post => ({
    uid: post.uid,
    first_publication_date: post.first_publication_date,
    // first_publication_date: format(
    //   new Date(post.first_publication_date),
    //   'dd MMM yyyy',
    //   {
    //     locale: ptBR,
    //   }
    // ),
    data: {
      title: post.data.title,
      subtitle: post.data.subtitle,
      author: post.data.author,
    },
  }));

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
    },
    revalidate: 60 * 60, // 1 hour
  };
};
