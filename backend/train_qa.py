'''Fit the TF-IDF retrieval index over the agronomy knowledge base.
Run once, or whenever knowledge/ changes:  python train_qa.py
'''
import json, os, sys, pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'knowledge'))
import kb_part1, kb_part2, kb_part3, kb_queries

DOCS = kb_part1.DOCS + kb_part2.DOCS + kb_part3.DOCS
print('passages loaded:', len(DOCS))

ids = [d['id'] for d in DOCS]
assert len(set(ids)) == len(ids), 'duplicate passage id'

# The searchable string weights the title and tags more heavily than body text,
# because a query usually matches the topic of a passage rather than its prose.
corpus = []
for d in DOCS:
    corpus.append(' '.join([
        (d['title'] + ' ') * 5,
        (kb_queries.QUERIES.get(d['id'], '') + ' ') * 4,
        (d['topic'] + ' ') * 2,
        (d['tags'] + ' ') * 2,
        d['text'],
    ]))

vec = TfidfVectorizer(
    lowercase=True,
    stop_words='english',
    ngram_range=(1, 2),
    sublinear_tf=True,
    min_df=1,
    max_df=0.85,
)
X = vec.fit_transform(corpus)
X = X / np.sqrt(X.multiply(X).sum(axis=1))   # L2 normalise rows for cosine

print('vocabulary size :', len(vec.vocabulary_))
print('matrix shape    :', X.shape)
print('density         : %.4f' % (X.nnz / (X.shape[0] * X.shape[1])))

os.makedirs('model', exist_ok=True)
with open('model/qa_index.pkl', 'wb') as f:
    pickle.dump({'vectorizer': vec, 'matrix': X, 'docs': DOCS}, f)

size = os.path.getsize('model/qa_index.pkl') / 1024
print('saved model/qa_index.pkl (%.1f KB)' % size)

# quick sanity retrieval
def top(q, k=3):
    qv = vec.transform([q])
    qv = qv / (np.sqrt(qv.multiply(qv).sum()) or 1)
    sims = (X @ qv.T).toarray().ravel()
    order = sims.argsort()[::-1][:k]
    return [(DOCS[i]['title'], round(float(sims[i]), 3)) for i in order]

print()
for q in ['why are my leaves yellow', 'how do I treat late blight',
          'what pH does tomato need', 'aphids on my plants']:
    print(q, '->', top(q, 2))
