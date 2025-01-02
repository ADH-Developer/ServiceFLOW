import React from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>ServiceFLOW</title>
        <meta name="description" content="ServiceFLOW - Workflow Management System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <span style={{ color: '#0070f3' }}>ServiceFLOW</span>
        </h1>

        <p className={styles.description}>
          Your modern workflow management solution
        </p>

        <div className={styles.grid}>
          <a href="/login" className={styles.card}>
            <h2>Login &rarr;</h2>
            <p>Access your workflow dashboard.</p>
          </a>

          <a href="/register" className={styles.card}>
            <h2>Register &rarr;</h2>
            <p>Create a new account to get started.</p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>ServiceFLOW - Powered by Next.js and Django</p>
      </footer>
    </div>
  )
}

export default Home
