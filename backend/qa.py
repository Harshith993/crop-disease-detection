'''Retrieval question answering over the agronomy knowledge base.
Loads the index fitted by train_qa.py and answers queries by cosine similarity.
'''
import os, pickle
import numpy as np

_INDEX = None
MIN_SCORE = 0.10
STRONG_SCORE = 0.20

def _load():
    global _INDEX
    if _INDEX is None:
        path = os.path.join(os.path.dirname(__file__), 'model', 'qa_index.pkl')
        with open(path, 'rb') as f:
            _INDEX = pickle.load(f)
    return _INDEX

def topics():
    ix = _load()
    seen, out = set(), []
    for d in ix['docs']:
        if d['topic'] not in seen:
            seen.add(d['topic'])
            out.append(d['topic'])
    return out

def ask(query, k=3):
    ix = _load()
    vec, X, docs = ix['vectorizer'], ix['matrix'], ix['docs']
    q = (query or '').strip()
    if len(q) < 3:
        return dict(answered=False, results=[],
                    message='Type a question about crops, leaves or plant disease.')
    qv = vec.transform([q])
    norm = np.sqrt(qv.multiply(qv).sum())
    if norm == 0:
        return dict(answered=False, results=[],
                    message='No match for those terms. Try naming a symptom, a disease or a crop task.')
    qv = qv / norm
    sims = (X @ qv.T).toarray().ravel()
    hits = []
    for i in sims.argsort()[::-1][:k]:
        if sims[i] < MIN_SCORE:
            break
        d = docs[i]
        hits.append(dict(id=d['id'], topic=d['topic'], title=d['title'],
                         text=d['text'], score=round(float(sims[i]), 3)))
    if not hits:
        return dict(answered=False, results=[],
                    message='No confident match in the knowledge base. This system covers tomato leaf disease, plant nutrition, pests, soil and crop care.')
    return dict(answered=True, confident=hits[0]['score'] >= STRONG_SCORE,
                answer=hits[0]['text'], title=hits[0]['title'],
                topic=hits[0]['topic'], score=hits[0]['score'], results=hits)
