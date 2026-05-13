-- Keyword-based fallback for RAG retrieval.
-- Used when no embedding provider is configured (DEEPSEEK_API_KEY without
-- OPENAI_API_KEY). Returns the same shape as match_document_chunks so the
-- chat route can swap retrieval modes transparently.
--
-- Strategy: split the natural-language question into word tokens (longer than
-- two chars to drop typical stopwords / articles), OR them in a tsquery for
-- broad recall, then re-rank by ts_rank_cd. ILIKE on the whole question is
-- kept as an additional signal so short queries still match exact phrases.

create or replace function public.match_document_chunks_by_text (
  query_text text,
  match_count int default 8
)
  returns table (
    id uuid,
    content text,
    metadata jsonb,
    similarity float8
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  with words as (
    select array_remove(
      array(
        select word
          from regexp_split_to_table(lower(coalesce(query_text, '')), E'[^[:alnum:]]+') as word
         where length(word) > 2
      ),
      ''
    ) as tokens,
    lower(coalesce(query_text, '')) as needle
  ),
  q as (
    select
      case
        when cardinality(tokens) = 0 then null
        else to_tsquery('simple', array_to_string(tokens, ' | '))
      end as ts_query,
      needle
      from words
  )
  select
    dc.id,
    dc.content,
    dc.metadata,
    (
      coalesce(
        ts_rank_cd(to_tsvector('simple', dc.content), (select ts_query from q)),
        0
      )
      + case
          when length((select needle from q)) > 0
           and dc.content ilike '%' || (select needle from q) || '%'
          then 0.1
          else 0
        end
    )::float8 as similarity
    from public.document_chunks dc
   where
     (
       (select ts_query from q) is not null
       and to_tsvector('simple', dc.content) @@ (select ts_query from q)
     )
     or (
       length((select needle from q)) > 0
       and dc.content ilike '%' || (select needle from q) || '%'
     )
   order by similarity desc
   limit match_count;
$$;

grant execute on function public.match_document_chunks_by_text (text, int) to service_role;
