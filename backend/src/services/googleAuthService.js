// src/services/googleAuthService.js
//
// Verifies a Google ID token (from the frontend's "Sign in with Google"
// button) and logs the student in — no password step needed, since Google
// already handled sign-in (and any 2-step verification the account has
// turned on) before issuing this token.
//
// Unlike Microsoft sign-in (which requires a student record to already
// exist), Google sign-in here accepts ANY Google account and auto-creates a
// student profile on first login. This trades gatekeeping for convenience —
// anyone who can complete a Google sign-in becomes a student in SIMES.
// Fine for open testing; worth tightening back up (e.g. restrict by email
// domain) before any real rollout.
//
// Setup required (see README): a free Google Cloud OAuth Client ID, put in
// GOOGLE_CLIENT_ID below and VITE_GOOGLE_CLIENT_ID on the frontend.

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.js';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const jwks = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
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

const verifyGoogleIdToken = (idToken) =>
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
        audience: GOOGLE_CLIENT_ID,
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });

// Generates a unique-enough student ID for auto-created accounts, since a
// real Google account has no STI student number attached to it.
const generatePlaceholderStudentId = () =>
  `G-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

const createStudentFromGoogleProfile = async (decoded) => {
  const email = decoded.email;
  const firstName = decoded.given_name || decoded.name?.split(' ')[0] || 'New';
  const lastName = decoded.family_name || decoded.name?.split(' ').slice(1).join(' ') || 'Student';

  const user = await prisma.user.create({
    data: {
      email,
      password: '', // this account only ever signs in via Google
      role: 'STUDENT',
      isActive: true,
      student: {
        create: {
          studentId: generatePlaceholderStudentId(),
          firstName,
          lastName,
          course: 'Not set',
          section: 'Not set',
          email,
          contactNumber: 'Not set',
          ojt_status: 'NOT_STARTED'
        }
      }
    },
    include: { student: true }
  });

  return user;
};

export const loginWithGoogle = async (idToken) => {
  if (!GOOGLE_CLIENT_ID) {
    const error = new Error('Google sign-in is not configured on this server yet (GOOGLE_CLIENT_ID missing in backend/.env).');
    error.status = 501;
    throw error;
  }

  let decoded;
  try {
    decoded = await verifyGoogleIdToken(idToken);
  } catch (err) {
    const error = new Error('Could not verify Google sign-in. Please try again.');
    error.status = 401;
    throw error;
  }

  const email = decoded.email;
  if (!email) {
    const error = new Error('Google account did not return an email address.');
    error.status = 400;
    throw error;
  }

  if (decoded.email_verified === false) {
    const error = new Error('Google account email is not verified.');
    error.status = 401;
    throw error;
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: { student: true }
  });

  // No matching account yet — create one on the spot rather than rejecting.
  // Admin accounts are never auto-created this way (see role check below);
  // only students land here.
  if (!user) {
    user = await createStudentFromGoogleProfile(decoded);
  }

  if (!user.isActive) {
    const error = new Error('Account is disabled. Contact the OJT coordinator.');
    error.status = 403;
    throw error;
  }

  if (user.role !== 'STUDENT') {
    const error = new Error('Admin accounts sign in with email and password, not Google. Use the "Log in with Admin" option.');
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
