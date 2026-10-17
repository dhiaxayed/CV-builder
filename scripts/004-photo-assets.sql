BEGIN;
-- Photos live once in uploaded_files. Drafts and snapshots contain a stable URL.
CREATE OR REPLACE FUNCTION public.save_photo(p_user_id text, p_target text, p_cv_id text, p_expected_revision bigint, p_file_id text, p_data_url text, p_name text, p_size integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE cv_row public.cvs; v_photo_url text := '/api/photos/' || p_file_id;
BEGIN
  IF p_target = 'cv' THEN
    SELECT * INTO cv_row FROM public.cvs WHERE id=p_cv_id AND user_id=p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
    IF cv_row.revision <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  ELSIF p_target = 'profile' THEN
    PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
  ELSE RAISE EXCEPTION 'INVALID_PHOTO_TARGET';
  END IF;
  INSERT INTO public.uploaded_files(id,user_id,file_type,file_name,file_size,mime_type,storage_url,storage_provider)
    VALUES(p_file_id,p_user_id,'photo',p_name,p_size,'image/webp',p_data_url,'database');
  IF p_target = 'cv' THEN
    UPDATE public.cvs SET draft_data=jsonb_set(draft_data,'{basics,photoUrl}',to_jsonb(v_photo_url),true),
      photo_url=v_photo_url,revision=revision+1 WHERE id=p_cv_id RETURNING * INTO cv_row;
    RETURN jsonb_build_object('url',v_photo_url,'revision',cv_row.revision);
  ELSE
    UPDATE public.users SET photo_url=v_photo_url WHERE id=p_user_id;
    RETURN jsonb_build_object('url',v_photo_url);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_photo(text,text,text,bigint,text,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_photo(text,text,text,bigint,text,text,text,integer) TO service_role;
COMMIT;
