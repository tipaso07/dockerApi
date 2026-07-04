const { Router } = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notificacion = require('../models/Notificacion');
const { verificarToken } = require('../middleware/auth');

const router = Router();

router.post('/', verificarToken, async (req, res) => {
  try {
    const { contenido, postId } = req.body;
    if (!contenido || !postId) {
      return res.status(400).json({ error: 'contenido y postId son requeridos' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    const comment = new Comment({ contenido, autor: req.usuario.id, postId });
    await comment.save();

    const commentPoblado = await Comment.findById(comment._id).populate('autor', 'nombre email');

    if (post.autor.toString() !== req.usuario.id) {
      await Notificacion.create({
        usuarioId: post.autor,
        tipo: 'comentario',
        mensaje: `${req.usuario.nombre} comentó en tu publicación`,
        referenciaId: postId
      });
      req.app.get('io').emit('nueva_notificacion', { usuarioId: post.autor });
    }

    res.status(201).json(commentPoblado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/post/:postId', async (req, res) => {
  try {
    const comentarios = await Comment.find({ postId: req.params.postId })
      .populate('autor', 'nombre email avatar')
      .sort({ fecha: 1 });
    res.json(comentarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verificarToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    if (comment.autor.toString() !== req.usuario.id && req.usuario.rol !== 'Admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar este comentario' });
    }

    comment.contenido = req.body.contenido || comment.contenido;
    await comment.save();

    const commentPoblado = await Comment.findById(comment._id).populate('autor', 'nombre email');
    res.json(commentPoblado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    if (comment.autor.toString() !== req.usuario.id && req.usuario.rol !== 'Admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Comentario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('autor', 'nombre email avatar')
      .populate('postId', 'contenido');
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', verificarToken, async (req, res) => {
  try {
    const comentarios = await Comment.find()
      .populate('autor', 'nombre email avatar')
      .populate('postId', 'contenido')
      .sort({ fecha: -1 });
    res.json(comentarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
