const { Router } = require('express');
const Post = require('../models/Post');
const PostLike = require('../models/PostLike');
const Notificacion = require('../models/Notificacion');
const { verificarToken } = require('../middleware/auth');

const router = Router();

router.post('/', verificarToken, async (req, res) => {
  try {
    const { contenido } = req.body;
    if (!contenido) {
      return res.status(400).json({ error: 'El contenido es requerido' });
    }

    const nuevoPost = new Post({
      contenido,
      autor: req.usuario.id
    });

    const postGuardado = await nuevoPost.save();

    const postPoblado = await Post.findById(postGuardado._id).populate('autor', 'nombre email');
    res.status(201).json(postPoblado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('autor', 'nombre email')
      .sort({ fecha: -1 });

    const postsConLikes = await Promise.all(
      posts.map(async (post) => {
        const likesCount = await PostLike.countDocuments({ postId: post._id });
        return {
          ...post.toObject(),
          likesCount
        };
      })
    );

    res.json(postsConLikes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/likes', async (req, res) => {
  try {
    const likes = await PostLike.find({ postId: req.params.id })
      .populate('usuarioId', 'nombre avatar')
      .sort({ fecha: -1 });
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/like', verificarToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const usuarioId = req.usuario.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    const likeExistente = await PostLike.findOne({ postId, usuarioId });

    if (likeExistente) {
      await PostLike.findByIdAndDelete(likeExistente._id);
      return res.json({ mensaje: 'Like quitado', liked: false });
    } else {
      const nuevoLike = new PostLike({ postId, usuarioId });
      await nuevoLike.save();

      if (post.autor.toString() !== usuarioId) {
        await Notificacion.create({
          usuarioId: post.autor,
          tipo: 'like',
          mensaje: `${req.usuario.nombre} dio like a tu publicación`,
          referenciaId: postId
        });
        req.app.get('io').emit('nueva_notificacion', { usuarioId: post.autor });
      }

      return res.json({ mensaje: 'Like agregado', liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    if (post.autor.toString() !== req.usuario.id && req.usuario.rol !== 'Admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await PostLike.deleteMany({ postId: req.params.id });

    res.json({ mensaje: 'Post eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('autor', 'nombre email');
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    const likesCount = await PostLike.countDocuments({ postId: post._id });
    res.json({ ...post.toObject(), likesCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
