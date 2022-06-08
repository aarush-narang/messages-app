import Head from "next/head";
import { useState, useEffect } from "react";
import styles from "../../styles/FormStyles/Forms.module.css";
import { PasswordInput, Button, Input, ErrorMessage } from '../components/formComponents'
import * as cookie from 'cookie'
import { csrf } from "../../lib/middleware";
import { FormPagesHeader } from "../components/header";


export default function MyAccount({ csrfToken }) {
    
    return (
        <>
            testsetsetsetestst
        </>
    );
}

export async function getServerSideProps(context) {
    const { req, res } = context

    await csrf(req, res)
    return {
        props: { csrfToken: req.csrfToken() },
    }
}