// Unit tests for role-based Microsoft account verification.
//
// These run without a database, a server, or network access: the policy module
// is pure and the Graph module short-circuits to "not-configured" when no
// credentials are present. That is exactly the state of the current deployment,
// so the tests document what is enforced today versus what needs Graph.
import {
  SCHOOL_EMAIL_DOMAINS,
  isSchoolEmail,
  isSchoolAccountRole,
  roleEmailError,
  tenantError,
  getVerificationMode,
  getSchoolTenantId,
  assertMicrosoftLoginAllowed,
  getMicrosoftPolicyStatus
} from '../src/services/microsoftAccountPolicy.js';
import {
  getGraphConfigStatus,
  lookupSchoolMailbox,
  verifySchoolAccountForCreation
} from '../src/services/graphDirectoryService.js';

let pass = 0;
let fail = 0;

const check = (name, condition, detail = '') => {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
  }
};

const setEnv = (vars) => {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
};

const withEnv = async (vars, fn) => {
  const restore = setEnv(vars);
  try {
    return await fn();
  } finally {
    restore();
  }
};

const throwsStatus = async (fn, expectedStatus) => {
  try {
    await fn();
    return false;
  } catch (error) {
    return error.status === expectedStatus;
  }
};

const SCHOOL_EMAIL = 'cruz.352467@stamaria.sti.edu.ph';
const FAKE_SCHOOL_EMAIL = 'cruz.352466@stamaria.sti.edu.ph';
const PERSONAL_EMAIL = 'someone@outlook.com';

console.log('\n== role -> allowed Microsoft account ==');
check('STUDENT is a school-account role', isSchoolAccountRole('STUDENT'));
check('ADMIN is a school-account role', isSchoolAccountRole('admin'));
check('COORDINATOR is a school-account role', isSchoolAccountRole('COORDINATOR'));
check('SUPERVISOR is NOT a school-account role', !isSchoolAccountRole('SUPERVISOR'));

check('school email is recognized', isSchoolEmail(SCHOOL_EMAIL));
check('second institutional domain is recognized', isSchoolEmail('cruz.352467@stamaria.edu.ph'));
check('personal email is not a school email', !isSchoolEmail(PERSONAL_EMAIL));
check('lookalike domain is rejected', !isSchoolEmail('cruz.352467@stamaria.sti.edu.ph.evil.com'));
check('domain list is not empty', SCHOOL_EMAIL_DOMAINS.length > 0);

check('student + school email passes', roleEmailError({ email: SCHOOL_EMAIL, role: 'STUDENT' }) === null);
check(
  'student + personal email is rejected',
  /official STI College Sta\. Maria Microsoft school account/.test(
    roleEmailError({ email: PERSONAL_EMAIL, role: 'STUDENT' }) || ''
  )
);
check(
  'admin + personal email is rejected',
  Boolean(roleEmailError({ email: PERSONAL_EMAIL, role: 'ADMIN' }))
);
check(
  'coordinator + personal email is rejected',
  Boolean(roleEmailError({ email: PERSONAL_EMAIL, role: 'COORDINATOR' }))
);
check(
  'supervisor + personal email is allowed',
  roleEmailError({ email: PERSONAL_EMAIL, role: 'SUPERVISOR' }) === null
);
check(
  'supervisor + school email is allowed',
  roleEmailError({ email: SCHOOL_EMAIL, role: 'SUPERVISOR' }) === null
);
check(
  'malformed address is rejected for every role',
  Boolean(roleEmailError({ email: 'not-an-email', role: 'SUPERVISOR' }))
);

console.log('\n== verification mode ==');
await withEnv({ MS_ACCOUNT_VERIFY: undefined }, () => {
  check('default mode is warn (never silently "verified")', getVerificationMode() === 'warn');
});
await withEnv({ MS_ACCOUNT_VERIFY: 'ENFORCE' }, () => {
  check('mode is case-insensitive', getVerificationMode() === 'enforce');
});
await withEnv({ MS_ACCOUNT_VERIFY: 'nonsense' }, () => {
  check('unknown mode falls back to warn', getVerificationMode() === 'warn');
});

console.log('\n== school tenant ==');
await withEnv({ MS_SCHOOL_TENANT_ID: 'common' }, () => {
  check('"common" is not treated as a school tenant', getSchoolTenantId() === '');
});
await withEnv({ MS_SCHOOL_TENANT_ID: '11111111-2222-3333-4444-555555555555' }, () => {
  check('configured tenant is read', getSchoolTenantId() === '11111111-2222-3333-4444-555555555555');
  check(
    'school role in the right tenant passes',
    tenantError({ tenantId: '11111111-2222-3333-4444-555555555555', role: 'STUDENT', email: SCHOOL_EMAIL }) === null
  );
  check(
    'school role in another tenant is rejected',
    Boolean(tenantError({ tenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', role: 'STUDENT', email: SCHOOL_EMAIL }))
  );
  check(
    'supervisor is exempt from the tenant check',
    tenantError({ tenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', role: 'SUPERVISOR', email: PERSONAL_EMAIL }) === null
  );
});
await withEnv({ MS_SCHOOL_TENANT_ID: undefined }, () => {
  check('no tenant configured means the tenant check is unavailable, not failed', getSchoolTenantId() === '');
});

console.log('\n== super-admin bootstrap exception ==');
await withEnv(
  { SUPER_ADMIN_EMAIL: 'owner@gmail.com', SUPER_ADMIN_BOOTSTRAP_PERSONAL: undefined },
  () => {
    check(
      'personal super-admin is rejected by default',
      Boolean(roleEmailError({ email: 'owner@gmail.com', role: 'ADMIN' }))
    );
  }
);
await withEnv(
  { SUPER_ADMIN_EMAIL: 'owner@gmail.com', SUPER_ADMIN_BOOTSTRAP_PERSONAL: 'true' },
  () => {
    check(
      'explicit bootstrap flag allows only the configured super-admin',
      roleEmailError({ email: 'owner@gmail.com', role: 'ADMIN' }) === null
    );
    check(
      'bootstrap flag does not allow any other personal admin',
      Boolean(roleEmailError({ email: 'someone.else@gmail.com', role: 'ADMIN' }))
    );
  }
);

console.log('\n== Graph directory availability ==');
await withEnv(
  { MS_GRAPH_TENANT_ID: undefined, MS_GRAPH_CLIENT_ID: undefined, MS_GRAPH_CLIENT_SECRET: undefined },
  async () => {
    const config = getGraphConfigStatus();
    check('Graph is reported as not configured', config.configured === false);
    check('no credentials means no secret is ever sent', config.clientSecretPresent === false);

    const lookup = await lookupSchoolMailbox(SCHOOL_EMAIL);
    check('lookup returns not-configured instead of guessing', lookup.status === 'not-configured');

    const supervisor = await verifySchoolAccountForCreation(PERSONAL_EMAIL, 'SUPERVISOR');
    check('supervisor creation does not require the directory', supervisor.status === 'not-required');
    check('supervisor is never auto-verified at creation', supervisor.verified === false);
  }
);

console.log('\n== creation gate never fakes verification ==');
await withEnv(
  {
    MS_ACCOUNT_VERIFY: 'off',
    MS_GRAPH_TENANT_ID: undefined,
    MS_GRAPH_CLIENT_ID: undefined,
    MS_GRAPH_CLIENT_SECRET: undefined
  },
  async () => {
    const result = await verifySchoolAccountForCreation(FAKE_SCHOOL_EMAIL, 'STUDENT');
    check('mode off leaves the account unverified', result.verified === false);
    check('mode off is explicit about why', result.reason === 'verification-disabled');
  }
);

await withEnv(
  {
    MS_ACCOUNT_VERIFY: 'warn',
    MS_GRAPH_TENANT_ID: undefined,
    MS_GRAPH_CLIENT_ID: undefined,
    MS_GRAPH_CLIENT_SECRET: undefined
  },
  async () => {
    const result = await verifySchoolAccountForCreation(FAKE_SCHOOL_EMAIL, 'STUDENT');
    check('warn + no credentials does not reject (preserves creation)', result.status === 'unverified');
    check('warn + no credentials never claims verified', result.verified === false);
  }
);

await withEnv(
  {
    MS_ACCOUNT_VERIFY: 'enforce',
    MS_GRAPH_TENANT_ID: undefined,
    MS_GRAPH_CLIENT_ID: undefined,
    MS_GRAPH_CLIENT_SECRET: undefined
  },
  async () => {
    check(
      'enforce + no credentials fails closed with 503',
      await throwsStatus(() => verifySchoolAccountForCreation(FAKE_SCHOOL_EMAIL, 'STUDENT'), 503)
    );
    const supervisor = await verifySchoolAccountForCreation(PERSONAL_EMAIL, 'SUPERVISOR');
    check('enforce never blocks a company supervisor', supervisor.status === 'not-required');
  }
);

console.log('\n== Microsoft sign-in gate ==');
await withEnv({ MS_SCHOOL_TENANT_ID: undefined }, () => {
  check(
    'school account signing in as STUDENT passes',
    assertMicrosoftLoginAllowed({ email: SCHOOL_EMAIL, role: 'STUDENT', tenantId: 'tenant-a' }) === true
  );
  check(
    'personal account signing in as ADMIN is rejected (403)',
    (() => {
      try {
        assertMicrosoftLoginAllowed({ email: PERSONAL_EMAIL, role: 'ADMIN', tenantId: 'tenant-a' });
        return false;
      } catch (error) {
        return error.status === 403;
      }
    })()
  );
  check(
    'personal account signing in as SUPERVISOR passes',
    assertMicrosoftLoginAllowed({ email: PERSONAL_EMAIL, role: 'SUPERVISOR', tenantId: 'tenant-a' }) === true
  );
});

console.log('\n== Graph path (mocked, no network) ==');
const stubFetch = (handler) => {
  const original = global.fetch;
  global.fetch = handler;
  return () => {
    global.fetch = original;
  };
};

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

const graphEnv = {
  MS_ACCOUNT_VERIFY: 'enforce',
  MS_GRAPH_TENANT_ID: 'test-tenant',
  MS_GRAPH_CLIENT_ID: 'test-client',
  MS_GRAPH_CLIENT_SECRET: 'test-secret',
  MS_SCHOOL_TENANT_ID: undefined
};

await withEnv(graphEnv, async () => {
  const restore = stubFetch(async (url) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return jsonResponse(200, { access_token: 'token', expires_in: 3600 });
    }
    return jsonResponse(200, {
      id: 'directory-object-id',
      displayName: 'Cruz, Juan',
      userPrincipalName: SCHOOL_EMAIL,
      accountEnabled: true
    });
  });
  try {
    const result = await verifySchoolAccountForCreation(SCHOOL_EMAIL, 'STUDENT');
    check('Graph 200 marks the mailbox verified', result.verified === true && result.status === 'verified');
    check('Graph result records where verification came from', result.source === 'graph');
    check('Graph directory id is returned for auditing', result.directoryId === 'directory-object-id');
  } finally {
    restore();
  }
});

await withEnv(graphEnv, async () => {
  const restore = stubFetch(async (url) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return jsonResponse(200, { access_token: 'token', expires_in: 3600 });
    }
    return jsonResponse(404, { error: { code: 'Request_ResourceNotFound' } });
  });
  try {
    check(
      'Graph 404 rejects the non-existent school account (400)',
      await throwsStatus(() => verifySchoolAccountForCreation(FAKE_SCHOOL_EMAIL, 'STUDENT'), 400)
    );
  } finally {
    restore();
  }
});

await withEnv(graphEnv, async () => {
  const restore = stubFetch(async (url) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return jsonResponse(200, { access_token: 'token', expires_in: 3600 });
    }
    if (String(url).includes('%24filter=') || String(url).includes('$filter=')) {
      return jsonResponse(200, {
        value: [{ id: 'alias-id', accountEnabled: true, mail: SCHOOL_EMAIL, displayName: 'Alias User' }]
      });
    }
    return jsonResponse(404, { error: { code: 'Request_ResourceNotFound' } });
  });
  try {
    const result = await verifySchoolAccountForCreation(SCHOOL_EMAIL, 'STUDENT');
    check('a mailbox exposed only as an alias is still accepted', result.verified === true);
    check('the alias match returns the real directory id', result.directoryId === 'alias-id');
  } finally {
    restore();
  }
});

await withEnv(graphEnv, async () => {
  const restore = stubFetch(async (url) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return jsonResponse(200, { access_token: 'token', expires_in: 3600 });
    }
    return jsonResponse(403, { error: { code: 'Authorization_RequestDenied' } });
  });
  try {
    check(
      'Graph permission error fails closed in enforce mode (503)',
      await throwsStatus(() => verifySchoolAccountForCreation(SCHOOL_EMAIL, 'STUDENT'), 503)
    );
  } finally {
    restore();
  }
});

await withEnv({ ...graphEnv, MS_ACCOUNT_VERIFY: 'warn' }, async () => {
  const restore = stubFetch(async (url) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return jsonResponse(200, { access_token: 'token', expires_in: 3600 });
    }
    return jsonResponse(403, { error: { code: 'Authorization_RequestDenied' } });
  });
  try {
    const result = await verifySchoolAccountForCreation(SCHOOL_EMAIL, 'STUDENT');
    check('warn mode allows creation on a permission error', result.status === 'unverified');
    check('warn mode never reports verified on a permission error', result.verified === false);
    check('warn mode records the reason', result.reason === 'permission-error');
  } finally {
    restore();
  }
});

await withEnv(graphEnv, async () => {
  let called = false;
  const restore = stubFetch(async () => {
    called = true;
    return jsonResponse(500, {});
  });
  try {
    const result = await verifySchoolAccountForCreation(PERSONAL_EMAIL, 'SUPERVISOR');
    check('supervisor never triggers a Graph call', called === false);
    check('supervisor creation is not blocked by enforce mode', result.status === 'not-required');
  } finally {
    restore();
  }
});

console.log('\n== policy summary ==');
const summary = getMicrosoftPolicyStatus();
check('policy summary lists all school roles', summary.schoolRoles.length === 3);
check('policy summary lists supervisors as personal-capable', summary.personalAllowedRoles.includes('SUPERVISOR'));
check('policy summary reports the verification mode', ['off', 'warn', 'enforce'].includes(summary.verificationMode));

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
