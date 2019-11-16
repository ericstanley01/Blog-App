const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')

exports.sharedProfileData = async (req, res, next) => {
  let isVisitorsProfile = false
  let isFollowing = false
  if (req.session.user) {
    isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
    isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
  }
  req.isVisitorsProfile = isVisitorsProfile
  req.isFollowing = isFollowing

  // retrieve posts, followers and following counts
  let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
  let followerCountPromise = Follow.countFollowersById(req.profileUser._id)
  let followingCountPromise = Follow.countFollowingById(req.profileUser._id)

  let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])

  req.postCount = postCount
  req.followerCount = followerCount
  req.followingCount = followingCount

  next()
}

exports.mustBeLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next()
  } else {
    req.flash('errors', 'You must be logged in to perform that action')
    req.session.save(() => {
      res.redirect('/')
    })
  }
}

exports.login = (req, res) => {
  let user = new User(req.body)
  user.login().then((result) => {
    req.session.user = {
      avatar: user.avatar,
      username: user.data.username,
      _id: user.data._id
    }
    req.session.save(() => {
      res.redirect('/')
    })
  }).catch((err) => {
    req.flash('errors', err)
    req.session.save(() => {
      res.redirect('/')
    })
  })
}

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/')
  })
}

exports.register = (req, res) => {
  let user = new User(req.body)
  user.register().then(() => {
    req.session.user = {
      avatar: user.avatar,
      username: user.data.username,
      _id: user.data._id
    }
    req.session.save(() => {
      res.redirect('/')
    })
  }).catch((regErrors) => {
    regErrors.forEach((error) => {
      req.flash('regErrors', error)
    })
    req.session.save(() => {
      res.redirect('/')
    })
  })
}

exports.home = async (req, res) => {
  if (req.session.user) {
    // fetch feed of posts for current user
    let posts = await Post.getFeed(req.session.user._id)
    res.render('home-dashboard', {
      posts: posts
    })
  } else {
    res.render('home-guest', {regErrors: req.flash('regErrors')})
  }
}

exports.ifUserExists = (req, res, next) => {
  User.findByUsername(req.params.username).then((userDocument) => {
    req.profileUser = userDocument
    next()
  }).catch(() => {
    res.render('404')
  })
}

exports.profilePostsScreen = (req, res) => {
  // ask post model to posts by certain author id
  Post.findByAuthorId(req.profileUser._id).then((posts) => {
    res.render('profile', {
      currentPage: 'posts',
      posts: posts,
      title: `Profile for ${req.profileUser.username}`,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount
      }
    })
  }).catch(() => {
    res.render('404')
  })
}

exports.profileFollowersScreen = async (req, res) => {
  try {
    let followers = await Follow.getFollowersById(req.profileUser._id)
    res.render('profile-followers', {
      currentPage: 'followers',
      followers: followers,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount
      }
    })
  } catch (e) {
    res.render('404')
  } finally {

  }
}

exports.profileFollowingScreen = async (req, res) => {
  try {
    let following = await Follow.getFollowingById(req.profileUser._id)
    res.render('profile-following', {
      currentPage: 'following',
      following: following,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount
      }
    })
  } catch (e) {
    res.render('404')
  } finally {

  }
}

exports.doesUsernameExist = (req, res) => {
  User.findByUsername(req.body.username).then(() => {
    res.json(true)
  }).catch(() => {
    res.json(false)
  })
}

exports.doesEmailExist = async (req, res) => {
  let emailBool = await User.doesEmailExist(req.body.email)
  res.json(emailBool)
}

// api methods
exports.apiLogin = (req, res) => {
  let user = new User(req.body)
  user.login().then((result) => {
    res.json(jwt.sign({
      _id: user.data._id
    }, process.env.JWTSECRET, {
      expiresIn: '7d'
    }))
  }).catch((err) => {
    res.json('Sorry, your values are not correct')
  })
}

exports.apiMustBeLoggedIn = (req, res, next) => {
  try {
    req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
    next()
  } catch (e) {
    res.json('Sorry, you must provide a valid token')
  } finally {

  }
}

exports.apiGetPostsByUsername = async (req, res) => {
  try {
    let authorDoc = await User.findByUsername(req.params.username)
    let posts = await Post.findByAuthorId(authorDoc._id)
    res.json(posts)
  } catch (e) {
    res.json('Sorry, invalid user requested')
  } finally {

  }
}
