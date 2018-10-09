class UserLandError extends Error {
  constructor(original) {
    super(original.message);
    this.original = original;
  }
}

async function wrapErrorsWithUserLandError(fn) {
  try {
    return await fn();
  } catch (error) {
    throw new UserLandError(error);
  }
}

module.exports = {
  UserLandError,
  wrapErrorsWithUserLandError,
};
