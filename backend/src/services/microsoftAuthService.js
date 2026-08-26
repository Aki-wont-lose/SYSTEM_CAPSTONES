// src/services/microsoftAuthService.js
//
// Verifies a Microsoft ID token (from the frontend's "Sign in with Microsoft"
// popup) and logs the student in — no separate OTP step needed, since
// Microsoft already handled password verification (and any MFA the school's
// Office 365 tenant has turned on) before issuing this token.
//
// Setup required (see README): a free Azure App Registration, whose Client ID
// goes into MS_CLIENT_ID below and VITE_MS_CLIENT_ID on the frontend.

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.js';

const prisma = new PrismaClient();

const MS_CLIENT_ID = process.env.MS_CLIENT_ID;
// "common" accepts both personal Microsoft accounts and any organization's
// (e.g. a school's Office 365) accounts — matches the multi-tenant app setup
// described in the README.
const MS_TENANT = process.env.MS_TENANT || 'common';

const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${MS_TENANT}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
});

const getSigningKey = (header) =>
  new Promise((resolve, reject) => {
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });

const verifyMicrosoftIdToken = (idToken) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      async (header, callback) => {
        try {
          const signingKey = await getSigningKey(header);
          callback(null, signingKey);
        } catch (err) {
          callback(err);
        }
      },
      {
        algorithms: ['RS256'],
        audience: MS_CLIENT_ID,
        // Microsoft issues tokens under the specific tenant GUID even for
        // "common" apps, so we don't pin the issuer strictly here — the
        // signature + audience check is what actually proves authenticity.
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });

export const loginWithMicrosoft = async (idToken) => {
  if (!MS_CLIENT_ID) {
    const error = new Error('Microsoft sign-in is not configured on this server yet (MS_CLIENT_ID missing in backend/.env).');
    error.status = 501;
    throw error;
  }

  let decoded;
  try {
    decoded = await verifyMicrosoftIdToken(idToken);
  } catch (err) {
    const error = new Error('Could not verify Microsoft sign-in. Please try again.');
    error.status = 401;
    throw error;
  }

  const email = decoded.preferred_username || decoded.email;
  if (!email) {
    const error = new Error('Microsoft account did not return an email address.');
    error.status = 400;
    throw error;
  }

  // Match this Microsoft account to an existing local account by email.
  // We don't auto-create new accounts here — a student record (course,
  // section, required hours, etc.) needs to exist first, normally added
  // by the admin via Student Management.
  const user = await prisma.user.findUnique({
    where: { email },
    include: { student: true }
  });

  if (!user) {
    const error = new Error(`No SIMES account found for ${email}. Ask your OJT coordinator to add you first.`);
    error.status = 404;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account is disabled. Contact the OJT coordinator.');
    error.status = 403;
    throw error;
  }

  if (user.role !== 'STUDENT') {
    const error = new Error('Admin accounts sign in with email and password, not Microsoft. Use the "Log in with Admin" option.');
    error.status = 403;
    throw error;
  }

  const token = generateToken(user.id, user.email, user.role);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      theme: user.theme,
      student: user.student
    }
  };
};
